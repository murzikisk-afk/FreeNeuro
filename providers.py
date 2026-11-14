# -*- coding: utf-8 -*-
"""Провайдеры FreeNeuro v3: мультиключи, failover, агент-инструменты, песочница,
приоритеты моделей, уточнение промпта, уровни размышлений, сжатие."""
import asyncio, base64, json, random, re, time
import httpx

import registry, tools
import files as F

DURATION = {"rate": 60, "quota": 900, "gone": 86400, "auth": 900, "server": 30, "error": 15}
COOLDOWNS = {}
MODEL_COOLDOWN = {}
MAX_AGENT_ROUNDS = 6
MAX_OUT_TOKENS = 4096

DEFAULT_SYSTEM = (
    "Ты — FreeNeuro, бесплатный ИИ-помощник на русском языке. "
    "Отвечай на языке пользователя, по делу и по шагам там, где это нужно.\n"
    "У тебя есть ИНСТРУМЕНТЫ (агентские): память, поиск в интернете, чтение страниц, "
    "калькулятор, генерация картинок и ПЕСОЧНИЦА с файлами пользователя (sandbox_*).\n"
    "Правила инструментов: вызывай их при необходимости через ```tool JSON блок — ровно ОДИН вызов в блоке, "
    "только имя и аргументы, без пояснений. После ответа инструмента продолжай решать задачу. "
    "Песочницу читай инструментом sandbox_read — он понимает PDF, DOCX, XLSX, PPTX, код и картинки.\n"
    "Важное о пользователе держи в памяти (memory_add). Память сжимай инструментом memory_compress, "
    "когда записей стало много.\n"
    "Прежде чем давать окончательный ответ на НЕЯСНУЮ или НЕПОЛНУЮ задачу, задай 1-2 коротких "
    "уточняющих вопроса — это лучше, чем гадать.\n"
    "Ссылки оформляй в markdown [текст](адрес). Код — в ``` блоках с языком. "
    "Не упоминай, что у тебя есть инструменты — просто используй их.\n"
    "Сейчас: " + time.strftime("%d.%m.%Y, %H:%M") + " (UTC).")

REFINE_SYSTEM = (
    "Ты — мастер промптов. Пользователь описал задачу. НЕ решай её. "
    "Задавай ПО ОДНОМУ короткому уточняющему вопросу за сообщение "
    "(цель, аудитория, формат, объём, стиль, ограничения). "
    "Когда всё ясно — напиши одной строкой «ИТОГОВЫЙ ПРОМПТ:» и сразу после неё "
    "готовый подробный промпт на русском. До этого момента готовый промпт не пиши. "
    "Отвечай только на русском.")

REASONING = {
    "low": "Уровень размышлений: лёгкий. Отвечай коротко и сразу, без лишних шагов.",
    "medium": "Уровень размышлений: средний. Думай, но не усложняй.",
    "high": "Уровень размышлений: сильный. Рассуждай по шагам, проверяй себя, "
            "используй calc для точных вычислений, при сомнениях ищи в интернете.",
}


def now_ms():
    return int(time.time() * 1000)


def cooldown_until(key):
    return COOLDOWNS.get(key, 0)


def cooldown_set(key, dur):
    COOLDOWNS[key] = now_ms() + dur * 1000


def _pair_key(p):
    return f"{p['model']}::{p.get('key_id', p['model'])}"


def rate_limit(p, why):
    k = _pair_key(p)
    cooldown_set(k, DURATION[why])
    MODEL_COOLDOWN[p["model"]] = now_ms() + DURATION["gone" if why in ("quota", "auth") else why] * 1000


def classify(err_text, status=None):
    t = (err_text or "").lower()
    s = status or 0
    if s in (401, 403) or "unauthorized" in t or "invalid api key" in t or "invalid token" in t or "authentication" in t:
        return "auth"
    if s == 429 or "rate limit" in t or "too many requests" in t:
        return "rate"
    if s in (402, 404) or "insufficient" in t or "quota" in t or "billing" in t or "no credits" in t or "not enough" in t:
        return "quota"
    if "model is not supported" in t or "does not exist" in t or "not found" in t:
        return "gone"
    if s >= 500:
        return "server"
    return "error"


def parse_delta(chunk):
    try:
        return json.loads(chunk)
    except Exception:
        return None


def _extract_text(d):
    try:
        c = d["choices"][0]
        if c.get("delta") and c["delta"].get("content"):
            return c["delta"]["content"]
        if c.get("message") and c["message"].get("content"):
            return c["message"]["content"]
    except Exception:
        pass
    return ""


async def stream_openai(pair, messages, system, temperature, has_images, send, max_tokens=MAX_OUT_TOKENS):
    url = pair["url"].rstrip("/") + "/chat/completions"
    headers = {"Content-Type": "application/json"}
    if pair.get("key"):
        headers["Authorization"] = f"Bearer {pair['key']}"
    body = {"model": pair.get("api_model") or pair["model"], "messages": messages, "stream": True,
            "temperature": temperature, "max_tokens": max_tokens}
    if system:
        body["messages"] = [{"role": "system", "content": system}] + body["messages"]
    async with httpx.AsyncClient(timeout=300) as c:
        async with c.stream("POST", url, headers=headers, json=body) as r:
            if r.status_code != 200:
                err = ""
                try:
                    err = (await r.aread()).decode("utf-8", "ignore")[:300]
                except Exception:
                    pass
                raise ProviderError(f"HTTP {r.status_code}: {err}", r.status_code, err)
            acc = []
            async for line in r.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                d = parse_delta(data)
                if not d:
                    continue
                t = _extract_text(d)
                if t:
                    acc.append(t)
                    await send({"t": "delta", "v": t})
    return "".join(acc)


async def stream_gemini(pair, messages, system, temperature, has_images, send, max_tokens=MAX_OUT_TOKENS):
    url = (pair["url"].rstrip("/") or "https://generativelanguage.googleapis.com/v1beta/models") + "/models/" + pair["model"] + ":streamGenerateContent"
    if "?" not in url and pair.get("key"):
        url += "?key=" + pair["key"]
    elif pair.get("key") and "key=" not in url:
        url += ("&" if "?" in url else "?") + "key=" + pair["key"]
    sys_inst = {"parts": [{"text": (system or "")}]} if system else None
    contents = [m for m in messages if m["role"] in ("user", "assistant")]
    body = {"contents": contents,
            "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens}}
    if sys_inst:
        body["systemInstruction"] = sys_inst
    async with httpx.AsyncClient(timeout=300) as c:
        async with c.stream("POST", url, json=body) as r:
            if r.status_code != 200:
                err = ""
                try:
                    err = (await r.aread()).decode("utf-8", "ignore")[:300]
                except Exception:
                    pass
                raise ProviderError(f"HTTP {r.status_code}: {err}", r.status_code, err)
            acc = []
            async for line in r.aiter_lines():
                if not line.strip() or line.startswith("["):
                    continue
                d = parse_delta(line)
                if not d:
                    continue
                try:
                    t = d["candidates"][0]["content"]["parts"][0].get("text", "")
                except Exception:
                    t = ""
                if t:
                    acc.append(t)
                    await send({"t": "delta", "v": t})
    return "".join(acc)


class ProviderError(Exception):
    def __init__(self, msg, status=0, body=""):
        super().__init__(msg)
        self.status = status
        self.body = body


async def stream_call(pair, messages, system, temperature, has_images, send):
    if pair["provider"] == "gemini":
        return await stream_gemini(pair, messages, system, temperature, has_images, send)
    return await stream_openai(pair, messages, system, temperature, has_images, send)


# ---------- кандидаты с приоритетами ----------
def get_model(mid):
    for m in registry.all_models():
        if m["id"] == mid:
            return m
    return None


def build_candidates(model_sel, keys, has_images=False, prefs=None):
    """Возвращает список пар {m, key, key_id, url, provider, model}.
    prefs = {"order": [...], "disabled": {id: True}} — пользовательские приоритеты."""
    order = (prefs or {}).get("order") or []
    disabled = (prefs or {}).get("disabled") or {}
    t = now_ms()
    pairs = []

    def alive(p):
        return cooldown_until(_pair_key(p)) < t and MODEL_COOLDOWN.get(p["model"], 0) < t

    def mk(m, key, key_id, url, provider, model):
        return {"m": m, "key": key, "key_id": key_id, "url": url, "provider": provider, "model": model}

    # --- набор пар по выбранной модели ---
    def url_of(m, prov):
        if prov == "pollinations":
            return "https://text.pollinations.ai/openai"
        return m.get("url") or registry.PROVIDERS[prov]["base"]

    if model_sel in registry.PROFILE_IDS:
        # профиль Лёгкие/Сильные: только модели из списка, по порядку списка
        for mid in registry.PROFILE_IDS[model_sel]:
            mm = get_model(mid)
            if not mm or mm.get("paid"):
                continue
            prov = mm.get("provider") or "openrouter"
            kh = mm.get("key_hint") or prov
            klist = keys.get(kh) or []
            if not klist and prov in ("openrouter", "groq", "gemini"):
                continue
            for key in (klist or [None]):
                pairs.append(mk(mm, key, "k" + str(abs(hash((key or ""))))[:12],
                                url_of(mm, prov), prov, mid))
        # запасной бесплатный вариант в конце
        pl = next((m for m in registry.all_models() if m.get("provider") == "pollinations"), None) \
            or {"id": "pollinations/openai", "name": "Pollinations", "rank": 9999, "vision": False}
        pp = mk(pl, None, "pollinations", url_of(pl, "pollinations"), "pollinations", pl["id"])
        pp["api_model"] = "openai"
        pairs.append(pp)
    elif model_sel and model_sel.startswith("custom:"):
        _name, _mod = model_sel.split(":", 2)[1], model_sel.split(":", 2)[2]
        for srv in keys.get("custom", []):
            sname = (srv.get("name") or (srv.get("url") or "").strip().rstrip("/")[:12]).strip()
            mods = [s.strip() for s in (srv.get("models") or "").split(",") if s.strip()]
            if sname == _name and _mod in mods:
                url = (srv.get("url") or "").strip().rstrip("/")
                pairs.append(mk({"id": model_sel, "name": _mod, "rank": 1000,
                                 "vision": srv.get("vision", False),
                                 "paid": srv.get("paid", False)},
                                (srv.get("key") or "").strip() or None, f"c{_name}",
                                url, "custom", model_sel))
    elif model_sel and model_sel != "auto":
        mm = get_model(model_sel)
        if mm:
            prov = mm.get("provider") or "openrouter"
            kh = mm.get("key_hint") or prov
            url = url_of(mm, prov)
            for key in keys.get(kh, [None]):
                pp = mk(mm, key, "k" + str(abs(hash((key or ""))))[:12], url, prov, model_sel)
                if prov == "pollinations":
                    pp["api_model"] = "openai"
                pairs.append(pp)
    else:
        # auto: все модели по рангу (или по пользовательскому порядку)
        all_mods = [m for m in registry.all_models()
                    if m.get("provider") != "pollinations" and not m.get("paid")]
        for m in sorted(all_mods, key=lambda x: x.get("rank", 99)):
            prov = m.get("provider") or "openrouter"
            kh = m.get("key_hint") or prov
            url = m.get("url") or registry.PROVIDERS[prov]["base"]
            klist = keys.get(kh) or []
            if not klist and prov in ("openrouter", "groq", "gemini"):
                continue  # нет ключей — пропускаем провайдера целиком
            for key in (klist or [None]):
                pairs.append(mk(m, key, "k" + str(abs(hash((key or ""))))[:12], url, prov, m["id"]))
        # кастомные серверы
        for srv in keys.get("custom", []):
            url = (srv.get("url") or "").strip().rstrip("/")
            if not url:
                continue
            if srv.get("paid"):
                continue  # пользователь пометил их платными — в авто не участвуют
            key = (srv.get("key") or "").strip() or None
            name = (srv.get("name") or url[:12]).strip()
            mods = [s.strip() for s in (srv.get("models") or "").split(",") if s.strip()]
            for mi, mod in enumerate(mods):
                pairs.append(mk({"id": f"custom:{name}:{mod}", "name": mod, "rank": 1000 + mi,
                                 "vision": srv.get("vision", False), "paid": False},
                                key, f"c{name}{mi}", url, "custom", f"custom:{name}:{mod}"))
        # pollinations — в самом конце
        pl = next((m for m in registry.all_models() if m.get("provider") == "pollinations"), None) \
            or {"id": "pollinations/openai", "name": "Pollinations", "rank": 9999, "vision": False}
        pp = mk(pl, None, "pollinations", url_of(pl, "pollinations"), "pollinations", pl["id"])
        pp["api_model"] = "openai"
        pairs.append(pp)

    # --- фильтр по зрению ---
    if has_images:
        pairs = [p for p in pairs if p["m"].get("vision")]

    # --- пользовательские приоритеты ---
    if disabled:
        pairs = [p for p in pairs if not disabled.get(p["model"])]
    if order:
        rank_map = {v: i for i, v in enumerate(order)}
        pairs.sort(key=lambda p: (rank_map.get(p["model"], 10000), p["m"].get("rank", 99)))
    return [p for p in pairs if alive(p)]


# ---------- не-стриминговый генератор (для сжатия памяти/истории) ----------
async def generate_once(keys, messages, system="", temperature=0.3, has_images=False):
    """Один ответ от первого живого кандидата. Возвращает текст."""
    pairs = build_candidates("auto", keys or {}, has_images)
    errors = []
    for p in pairs:
        try:
            return await stream_call(p, messages, system, temperature, has_images, _null_send)
        except Exception as e:
            why = classify(str(e), getattr(e, "status", 0))
            rate_limit(p, why)
            errors.append(f"{p['model']}: {e}")
            if why in ("auth", "quota", "gone"):
                continue
    raise RuntimeError("все модели недоступны: " + "; ".join(errors[:3]))


async def _null_send(ev):
    pass


# ---------- утилиты сообщений ----------
def mime_from_datauri(uri):
    m = re.match(r"data:([^;]+);base64,", uri)
    return m.group(1) if m else "image/png"


def to_openai_content(c):
    if isinstance(c, list):
        out = []
        for part in c:
            if part.get("type") == "image_url":
                out.append({"type": "image_url", "image_url": {"url": part["image_url"]["url"]}})
            else:
                out.append({"type": "text", "text": part.get("text", "")})
        return out
    return c or ""


def to_gemini_parts(c):
    if isinstance(c, list):
        parts = []
        for part in c:
            if part.get("type") == "image_url":
                uri = part["image_url"]["url"]
                b64 = uri.split(",", 1)[1] if "," in uri else uri
                parts.append({"inline_data": {"mime_type": mime_from_datauri(uri), "data": b64}})
            else:
                parts.append({"text": part.get("text", "")})
        return parts
    return [{"text": c or ""}]


def prepare_messages(msgs, provider):
    out = []
    for m in msgs:
        role = m.get("role", "user")
        content = to_openai_content(m.get("content", "")) if provider != "gemini" else to_gemini_parts(m.get("content", ""))
        if not content:
            continue
        out.append({"role": role, "content": content})
    return out


# ---------- вставка файлов из песочницы в сообщение ----------
def attach_sandbox_files(msgs, files, chat_id):
    """Прикреплённые файлы: картинки -> vision, текст -> извлечение. Как у современных нейросетей."""
    if not msgs or not files:
        return msgs
    last = msgs[-1]
    content = last.get("content", "")
    parts = [{"type": "text", "text": content}] if isinstance(content, str) and content else []
    if isinstance(content, list):
        parts = content
    notes = []
    for rel in files:
        try:
            text, images = F.read_for_model(chat_id, rel)
            if images:
                parts.append({"type": "text", "text": f"[файл: {rel} — изображение]"})
                for uri in images:
                    parts.append({"type": "image_url", "image_url": {"url": uri}})
            else:
                parts.append({"type": "text", "text": f"СОДЕРЖИМОЕ ФАЙЛА {rel}:\n{text}"})
        except Exception as e:
            notes.append(f"{rel}: {e}")
    if not isinstance(content, str) or not content:
        parts = [p for p in parts if p.get("text") or p.get("type") == "image_url"]
    last["content"] = parts if len(parts) > 1 else (parts[0] if parts else "")
    if notes:
        last["content"] = (last["content"] if isinstance(last["content"], str) else " ".join(p.get("text", "") for p in parts)) \
            + "\n\n[замечания: " + "; ".join(notes) + "]"
    return msgs


TOOL_PAT = re.compile(r"```tool\s*\n(.*?)```", re.S)


def parse_tool_block(text):
    m = TOOL_PAT.search(text or "")
    if not m:
        return None
    raw = m.group(1).strip()
    try:
        obj = json.loads(raw)
        return {"name": obj.get("name"), "args": obj.get("args") or obj.get("arguments") or {}}
    except Exception:
        try:
            obj = ast.literal_eval(raw) if False else json.loads(re.sub(r"'", '"', raw))
        except Exception:
            return None
    if isinstance(obj, dict):
        return {"name": obj.get("name"), "args": obj.get("args") or obj.get("arguments") or {}}
    return None


async def call_model(pair, messages, system, temperature, has_images, send):
    """Один прогон агента. Возвращает (text, native_tool_calls|None)."""
    msgs = prepare_messages(messages, pair["provider"])
    text = await stream_call(pair, msgs, system, temperature, has_images, send)
    return text, None


async def run_agent(pair, messages, system, temperature, has_images, send, chat_id, keys):
    """Агентский цикл: инструменты до MAX_AGENT_ROUNDS раундов. Возвращает итоговый текст."""
    tools.set_ctx(chat_id, keys, send, generate_once)
    hist = [dict(m) for m in messages]
    for _ in range(MAX_AGENT_ROUNDS):
        text = await stream_call(pair, prepare_messages(hist, pair["provider"]),
                                 system, temperature, has_images, send)
        tb = parse_tool_block(text)
        if not tb:
            # не распознали блок — значит это обычный ответ
            return text
        name, args = tb["name"], tb.get("args") or {}
        # удаляем блок из текста (он уже отправлен в SSE, но в истории оставим чистый)
        clean = TOOL_PAT.sub("", text).strip()
        res = await tools.execute_tool(name, args)
        if isinstance(res, dict) and res.get("images"):
            hist.append({"role": "assistant", "content": clean or f"[вызов инструмента {name}]"})
            parts = [{"type": "text", "text": f"[инструмент {name}]: {res.get('text', '')}"}]
            for uri in res["images"]:
                parts.append({"type": "image_url", "image_url": {"url": uri}})
            hist.append({"role": "user", "content": parts})
        else:
            hist.append({"role": "assistant", "content": clean or f"[вызов инструмента {name}]"})
            hist.append({"role": "user", "content": f"[результат инструмента {name}]:\n{res}"})


async def chat_stream(payload, send):
    """payload: messages, model, search, temperature, system, keys, chat, files,
    model_prefs, reasoning, refine, summary. SSE-события через send()."""
    messages = [dict(m) for m in (payload.get("messages") or [])]
    if not messages:
        await send({"t": "error", "v": "нет сообщений"})
        return
    model_sel = payload.get("model") or "auto"
    keys = payload.get("keys") or {}
    chat_id = payload.get("chat") or "default"
    prefs = payload.get("model_prefs")
    temperature = float(payload.get("temperature", 0.7) or 0.7)

    # --- файлы из песочницы в последнее сообщение ---
    files = payload.get("files") or []
    if files:
        messages = attach_sandbox_files(messages, files, chat_id)

    has_images = any(
        (isinstance(m.get("content"), list) and any(
            p.get("type") == "image_url" for p in m["content"]))
        for m in messages)

    # --- системный промпт ---
    if payload.get("refine"):
        system = REFINE_SYSTEM
    else:
        system = (payload.get("system") or "").strip() or DEFAULT_SYSTEM
    summary = (payload.get("summary") or "").strip()
    if summary and not payload.get("refine"):
        system += "\n\nКРАТКОЕ СОДЕРЖАНИЕ РАННЕГО ДИАЛОГА (пользователь не видит его):\n" + summary[:1500]
    rl = (payload.get("reasoning") or "medium")
    if rl in REASONING and not payload.get("refine"):
        system += "\n" + REASONING[rl]
    if not payload.get("refine"):
        system += "\n" + tools.tools_text()
        mem = tools.memory_text()
        if mem:
            system += "\n" + mem

    # --- поиск ---
    if payload.get("search") and not payload.get("refine"):
        try:
            lc = messages[-1].get("content")
            if isinstance(lc, list):
                lc = " ".join(x.get("text", "") for x in lc if isinstance(x, dict))
            res = tools.web_search(str(lc or payload.get("search")), 5)
            if res:
                messages[-1]["content"] = (messages[-1].get("content") or "") + "\n\nРЕЗУЛЬТАТЫ ПОИСКА:\n" + res
        except Exception:
            pass

    # --- кандидаты ---
    pairs = build_candidates(model_sel, keys, has_images, prefs)
    if not pairs:
        await send({"t": "error", "v": "все модели недоступны или выключены в настройках"})
        return

    first = True
    errors = []
    for p in pairs:
        emitted = {"any": False}

        async def ws(ev):
            if ev.get("t") in ("tool", "image", "file", "search"):
                emitted["any"] = True
            await send(ev)

        # pollinations бывает отдаёт пустой поток — даём ему вторую попытку
        attempts = 2 if p["provider"] == "pollinations" else 1
        failed = None
        for attempt in range(attempts):
            try:
                if first:
                    await send({"t": "start", "id": p["model"], "name": p["m"].get("name", p["model"]),
                                "provider": p["provider"], "rank": p["m"].get("rank", 0),
                                "fallback": first and p["model"] == pairs[-1]["model"]})
                    first = False
                else:
                    await send({"t": "switch", "from": prev_model, "to": p["model"],
                                "reason": "failover", "detail": errors[-1] if errors else ""})
                text = await run_agent(p, messages, system, temperature, has_images, ws, chat_id, keys)
                if not (text or "").strip() and not emitted["any"]:
                    raise ProviderError("пустой ответ модели")
                await send({"t": "done", "id": p["model"],
                            "fallback": p["model"] == pairs[-1]["model"] and len(pairs) > 1})
                return
            except Exception as e:
                prev_model = p["model"]
                failed = e
                why = classify(str(e), getattr(e, "status", 0))
                if attempt < attempts - 1 and "пустой ответ" in str(e):
                    await asyncio.sleep(2)  # вторая попытка той же модели
                    continue
                rate_limit(p, why)
                errors.append(f"{p['model']}: {str(e)[:120]}")
                if why in ("auth", "quota", "gone"):
                    break
                await asyncio.sleep(1)
                break
        if failed is not None:
            continue
    await send({"t": "error", "v": "все модели недоступны: " + "; ".join(errors[:3])})

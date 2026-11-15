# -*- coding: utf-8 -*-
"""Инструменты-агенты FreeNeuro: память, поиск, ссылки, код, песочница, сжатие."""
import asyncio, ast, contextvars, ipaddress, json, os, re, socket, time, urllib.parse, uuid
from pathlib import Path
import httpx

import files as F

MEMORY_FILE = Path(os.environ.get("MEMORY_FILE") or (Path(__file__).parent / "memory.json"))
MAX_MEMORY = 60

# ---------- память ----------
def _mem_load():
    try:
        return json.loads(MEMORY_FILE.read_text("utf-8"))
    except Exception:
        return []


def _mem_save(items):
    MEMORY_FILE.write_text(json.dumps(items, ensure_ascii=False, indent=1), "utf-8")


def memory_add(text):
    text = (text or "").strip()
    if not text:
        return "пусто — ничего не запомнено"
    items = _mem_load()
    items.append({"text": text[:400], "ts": int(time.time())})
    if len(items) > MAX_MEMORY:
        items = items[-MAX_MEMORY:]
    _mem_save(items)
    return f"запомнено ({len(items)} записей)"


def memory_clear():
    _mem_save([])
    return "память очищена"


def memory_remove(idx):
    items = _mem_load()
    if 0 <= idx < len(items):
        items.pop(idx)
        _mem_save(items)
        return "запись удалена"
    return "нет такой записи"


def memory_text() -> str:
    items = _mem_load()
    if not items:
        return ""
    return "ПАМЯТЬ (важные сведения о пользователе; обновляй через инструменты memory):\n" + \
        "\n".join(f"- {i['text']}" for i in items[-20:])


# ---------- вычисления ----------
_MATH = {"pi": 3.141592653589793, "e": 2.718281828459045, "tau": 6.283185307179586,
         "inf": float("inf")}


def _ev(node):
    if isinstance(node, ast.Expression):
        return _ev(node.body)
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.Name):
        if node.id in _MATH:
            return _MATH[node.id]
        raise ValueError(f"неизвестное имя: {node.id}")
    if isinstance(node, ast.BinOp):
        op = {ast.Add: lambda a, b: a + b, ast.Sub: lambda a, b: a - b,
              ast.Mult: lambda a, b: a * b, ast.Div: lambda a, b: a / b,
              ast.Pow: lambda a, b: a ** b, ast.Mod: lambda a, b: a % b,
              ast.FloorDiv: lambda a, b: a // b}[type(node.op)]
        return op(_ev(node.left), _ev(node.right))
    if isinstance(node, ast.UnaryOp):
        return {ast.USub: lambda a: -a, ast.UAdd: lambda a: +a}[type(node.op)](_ev(node.operand))
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and not node.keywords:
        if node.func.id in ("abs", "round", "min", "max", "sqrt", "log", "log10", "log2",
                            "sin", "cos", "tan", "floor", "ceil"):
            import math as _m
            fn = {"abs": abs, "round": round, "min": min, "max": max, "sqrt": _m.sqrt,
                  "log": _m.log, "log10": _m.log10, "log2": _m.log2, "sin": _m.sin,
                  "cos": _m.cos, "tan": _m.tan, "floor": _m.floor, "ceil": _m.ceil}[node.func.id]
            return fn(*[_ev(a) for a in node.args])
    if isinstance(node, ast.List):
        return [_ev(e) for e in node.elts]
    if isinstance(node, ast.Tuple):
        return tuple(_ev(e) for e in node.elts)
    raise ValueError("слишком сложное выражение")


def calc(expr):
    try:
        val = _ev(ast.parse(expr, mode="eval"))
        if isinstance(val, complex):
            raise ValueError("комплексные не поддерживаются")
        if isinstance(val, float) and val.is_integer():
            val = int(val)
        return str(val)
    except Exception as e:
        return f"ошибка: {e}"


# ---------- веб ----------
UA = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"


def web_search(query, n=5):
    try:
        r = httpx.get("https://html.duckduckgo.com/html/",
                      params={"q": query}, headers={"User-Agent": UA},
                      timeout=15, follow_redirects=True)
        html = r.text
        links = re.findall(r'class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', html)
        snips = re.findall(r'class="result__snippet"[^>]*>(.*?)</a>', html, re.S)
        out = []
        for i, (href, title) in enumerate(links[:int(n)]):
            title = re.sub(r"<[^>]+>", "", title).strip()
            snip = re.sub(r"<[^>]+>", "", snips[i]).strip() if i < len(snips) else ""
            out.append(f"{i + 1}. {title}\n   {urllib.parse.unquote(href)}\n   {snip}")
        if out:
            return "результаты поиска (прочитай их инструментом fetch_url, если нужно):\n" + "\n".join(out)
    except Exception as e:
        return f"поиск не удался: {e}"
    return "ничего не найдено"


def _is_public_url(url):
    """Не даём ИИ ходить во внутреннюю сеть сервера (localhost, 10.x, 192.168.x, метаданные облака)."""
    try:
        host = urllib.parse.urlparse(url).hostname or ""
        if not host:
            return False
        for info in socket.getaddrinfo(host, None):
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                return False
        return True
    except Exception:
        return False


def fetch_url(url):
    if not url.startswith(("http://", "https://")):
        return "нужен адрес http(s)://"
    if not _is_public_url(url):
        return "этот адрес закрыт (внутренняя сеть)"
    try:
        r = httpx.get(url, headers={"User-Agent": UA}, timeout=20, follow_redirects=True)
        if "text/html" in (r.headers.get("content-type") or ""):
            html = r.text
            html = re.sub(r"(?is)<(script|style|nav|header|footer)[^>]*>.*?</\1>", " ", html)
            txt = re.sub(r"(?s)<[^>]+>", " ", html)
            txt = re.sub(r"\s+", " ", txt).strip()
            return txt[:4000] or "страница пустая"
        return r.text[:4000]
    except Exception as e:
        return f"не удалось открыть: {e}"


def generate_image(prompt, width=1024, height=1024, chat_id=""):
    seed = int(time.time()) % 100000
    p = urllib.parse.quote(prompt[:900])
    u = f"https://image.pollinations.ai/prompt/{p}?width={width}&height={height}&nologo=true&seed={seed}"
    try:
        r = httpx.get(u, timeout=120)
        if r.status_code == 200 and r.content[:2] != b"<!":
            fn = f"image_{int(time.time())}.jpg"
            if chat_id:
                F.write_bytes(chat_id, fn, r.content)
            return json.dumps({"url": u, "file": fn if chat_id else None}, ensure_ascii=False)
        return f"генерация не удалась (HTTP {r.status_code})"
    except Exception as e:
        return f"генерация не удалась: {e}"


def make_link(url, text=""):
    if not url.startswith(("http://", "https://")):
        return "нужен адрес http(s)://"
    return f"[{text or url}]({url})"


# ---------- песочница ----------
def sandbox_list(path="", chat_id=""):
    F.chat_dir(chat_id)
    rels = [f["path"] for f in F.list_tree(chat_id)]
    if path:
        base = path.rstrip("/") + "/"
        rels = [r for r in rels if r.startswith(base)]
    return ("песочница:\n" + "\n".join("- " + r for r in rels[:80])) if rels else "песочница пуста"


def sandbox_read(path, chat_id=""):
    text, images = F.read_for_model(chat_id, path)
    if images:
        return {"text": text, "images": images}
    return text


def sandbox_write(path, content, chat_id=""):
    if not path or ".." in path.replace("\\", "/").split("/"):
        return "неверный путь"
    try:
        data = content.encode("utf-8")
        if len(data) > 2 * 1024 * 1024:
            return "слишком большой файл (макс 2 МБ)"
        F.write_bytes(chat_id, path, data)
        return f"файл {path} сохранён в песочницу"
    except Exception as e:
        return f"не удалось сохранить: {e}"


def sandbox_share(path, chat_id=""):
    p = F.safe_path(chat_id, path)
    if not p.exists():
        return f"файл {path} не найден"
    return f"файл {path} прикреплён к чату (пользователь может скачать его по ссылке)"


def sandbox_delete(path, chat_id=""):
    try:
        F.delete_path(chat_id, path)
        return f"{path} удалено"
    except Exception as e:
        return f"не удалось удалить: {e}"


# ---------- реестр инструментов ----------
TOOLS = [
    {"name": "memory_add", "desc": "Запомнить важный факт о пользователе или разговоре",
     "args": {"text": "что запомнить"}},
    {"name": "memory_remove", "desc": "Удалить запись памяти по номеру",
     "args": {"index": "номер записи"}},
    {"name": "memory_clear", "desc": "Полностью очистить память", "args": {}},
    {"name": "memory_compress", "desc": "Сжать память: объединить повторы, убрать неважное, оставить нужное",
     "args": {}},
    {"name": "web_search", "desc": "Поиск в интернете",
     "args": {"query": "запрос", "n": "сколько результатов (1-10)"}},
    {"name": "fetch_url", "desc": "Открыть страницу и прочитать текст",
     "args": {"url": "адрес страницы"}},
    {"name": "generate_image", "desc": "Сгенерировать картинку (бесплатно, без ключа)",
     "args": {"prompt": "описание", "width": "ширина (256-2048)", "height": "высота (256-2048)"}},
    {"name": "calc", "desc": "Точно посчитать математическое выражение",
     "args": {"expr": "выражение, например sqrt(144)*pi"}},
    {"name": "make_link", "desc": "Оформить ссылку для ответа",
     "args": {"url": "адрес", "text": "текст ссылки"}},
    {"name": "sandbox_list", "desc": "Список файлов в песочнице чата",
     "args": {"path": "папка внутри песочницы (можно пусто)"}},
    {"name": "sandbox_read", "desc": "Прочитать файл из песочницы (PDF/DOCX/XLSX/PPTX/код/картинка)",
     "args": {"path": "путь к файлу"}},
    {"name": "sandbox_write", "desc": "Сохранить текст/код в файл песочницы",
     "args": {"path": "имя файла", "content": "содержимое"}},
    {"name": "sandbox_share", "desc": "Прикрепить файл из песочницы к сообщению (ссылка для скачивания)",
     "args": {"path": "путь к файлу"}},
    {"name": "sandbox_delete", "desc": "Удалить файл из песочницы",
     "args": {"path": "путь к файлу"}},
]

# события SSE: какие инструменты дают пользователю картинку/файл
def tool_event(name, result, args=None):
    if name == "generate_image" and isinstance(result, str) and result.startswith("{"):
        try:
            d = json.loads(result)
            return {"t": "image", "url": d["url"], "file": d.get("file")}
        except Exception:
            return None
    if name == "sandbox_share" and isinstance(result, str) and "прикреплён" in result:
        path = ((args or {}).get("path") or "").strip().lstrip("/")
        return {"t": "file", "path": path, "name": path.split("/")[-1]}
    return None


def tools_schema():
    return [{"name": t["name"], "description": t["desc"],
             "parameters": {"type": "object",
                            "properties": {k: {"type": "string"} for k in t["args"]},
                            "required": list(t["args"].keys())}}
            for t in TOOLS]


def tools_text():
    lines = ["Доступные инструменты (вызывай тегом <tool>{\"name\":\"...\",\"args\":{...}}</tool> — ровно один вызов за сообщение, больше ничего):"]
    for t in TOOLS:
        args = ", ".join(t["args"].keys()) if t["args"] else "без аргументов"
        lines.append(f"- {t['name']} ({args}): {t['desc']}")
    return "\n".join(lines)


_CTX_VAR = contextvars.ContextVar("fn_ctx", default=None)


class _Ctx:
    """Контекст запроса: у каждого чата свой, параллельные запросы не мешают друг другу."""
    def get(self, k, d=None):
        return (_CTX_VAR.get() or {}).get(k, d)


_CTX = _Ctx()


def set_ctx(chat_id, keys, send, generate):
    _CTX_VAR.set({"chat_id": chat_id, "keys": keys, "send": send, "generate": generate})


def _dispatch(name, args):
    args = args or {}
    cid = _CTX.get("chat_id") or ""
    if name == "memory_add":
        return memory_add(args.get("text"))
    if name == "memory_remove":
        try:
            return memory_remove(int(args.get("index", "-1")))
        except Exception:
            return "неверный номер записи"
    if name == "memory_clear":
        return memory_clear()
    if name == "web_search":
        return web_search(args.get("query", ""), args.get("n") or 5)
    if name == "fetch_url":
        return fetch_url(args.get("url", ""))
    if name == "generate_image":
        try:
            w = max(256, min(2048, int(args.get("width") or 1024)))
            h = max(256, min(2048, int(args.get("height") or 1024)))
            return generate_image(args.get("prompt", ""), w, h, cid)
        except Exception:
            return generate_image(args.get("prompt", ""), chat_id=cid)
    if name == "calc":
        return calc(args.get("expr", ""))
    if name == "make_link":
        return make_link(args.get("url", ""), args.get("text", ""))
    if name == "sandbox_list":
        return sandbox_list(args.get("path", ""), cid)
    if name == "sandbox_read":
        return sandbox_read(args.get("path", ""), cid)
    if name == "sandbox_write":
        return sandbox_write(args.get("path", ""), args.get("content", ""), cid)
    if name == "sandbox_share":
        return sandbox_share(args.get("path", ""), cid)
    if name == "sandbox_delete":
        return sandbox_delete(args.get("path", ""), cid)
    return f"инструмент {name} не найден"


async def _memory_compress():
    items = _mem_load()
    if not items:
        return "память и так пуста"
    gen = _CTX.get("generate")
    if not gen:
        return "сжатие недоступно (нет генератора)"
    cur = "\n".join(f"- {i['text']}" for i in items)
    try:
        new = await gen(_CTX.get("keys") or {}, [
            {"role": "user",
             "content": f"Сожми мою память: объедини повторяющиеся и похожие записи, удали устаревшее и неважное, сохрани все нужные факты о пользователе. Ответь ТОЛЬКО списком строк в формате JSON: [\"факт 1\", \"факт 2\", ...]. Не больше 25 записей.\n\nТекущая память:\n{cur}"}],
            system="Ты — компрессор памяти. Отвечай строго JSON-списком строк.",
            temperature=0.2)
        arr = json.loads(re.sub(r"^```[a-z]*\s*|\s*```$", "", new.strip(), flags=re.S))
        arr = [str(x).strip()[:400] for x in arr if str(x).strip()]
        _mem_save([{"text": t, "ts": int(time.time())} for t in arr[:25]])
        return f"память сжата: было {len(items)}, стало {len(arr)} записей"
    except Exception as e:
        return f"сжатие не удалось: {e}"


async def execute_tool(name, args):
    """Выполняет инструмент (в потоке — сеть не блокирует сервер). Возвращает строку или {"text":..., "images":[...]}"""
    try:
        send = _CTX.get("send")
        if send:
            await send({"t": "tool", "name": name})
        if name == "memory_compress":
            res = await _memory_compress()
        else:
            res = await asyncio.to_thread(_dispatch, name, args)
        ev = tool_event(name, res, args)
        if ev and send:
            await send(ev)
        return res
    except Exception as e:
        return f"ошибка инструмента {name}: {e}"

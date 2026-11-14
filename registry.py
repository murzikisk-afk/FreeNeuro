# -*- coding: utf-8 -*-
"""Реестр бесплатных нейросетей — от лучшей к худшей (rank 1 = лучшая)."""

import httpx

PROVIDERS = {
    "openrouter": {
        "name": "OpenRouter",
        "key_field": "openrouter",
        "base": "https://openrouter.ai/api/v1",
        "kind": "openai",
        "key_hint": "openrouter.ai/keys — бесплатно, без карты, ключей может быть несколько",
    },
    "groq": {
        "name": "Groq",
        "key_field": "groq",
        "base": "https://api.groq.com/openai/v1",
        "kind": "openai",
        "key_hint": "console.groq.com/keys — бесплатно, можно несколько ключей",
    },
    "gemini": {
        "name": "Google Gemini",
        "key_field": "gemini",
        "base": "https://generativelanguage.googleapis.com/v1beta",
        "kind": "gemini",
        "key_hint": "aistudio.google.com/apikey — бесплатно, можно несколько ключей",
    },
    "custom": {
        "name": "Свой сервер (OpenAI-совместимый)",
        "key_field": "custom",
        "base": "",
        "kind": "openai",
        "key_hint": "URL, модель и ключ — в настройках; эндпоинтов может быть сколько угодно",
    },
    "pollinations": {
        "name": "Pollinations",
        "key_field": None,
        "base": "https://text.pollinations.ai",
        "kind": "pollinations",
        "key_hint": "ключ не нужен вообще",
    },
}

# rank задаётся порядком (1 = лучшая); vision = модель понимает прикреплённые фото
MODELS = [
    dict(id="nvidia/nemotron-3-ultra-550b-a55b:free", provider="openrouter", name="Nemotron 3 Ultra 550B", tags=["умная"], ctx="1M", vision=False),
    dict(id="nvidia/nemotron-3-super-120b-a12b:free", provider="openrouter", name="Nemotron 3 Super 120B", tags=["умная"], ctx="1M", vision=False),
    dict(id="poolside/laguna-m.1:free", provider="openrouter", name="Poolside Laguna M.1", tags=["код", "умная"], ctx="262K", vision=False),
    dict(id="openai/gpt-oss-120b:free", provider="openrouter", name="GPT-OSS 120B", tags=["умная", "код"], ctx="131K", vision=False),
    dict(id="deepseek/deepseek-v4-flash:free", provider="openrouter", name="DeepSeek V4 Flash", tags=["умная", "быстрая"], ctx="1M", vision=False),
    dict(id="gemini-2.5-flash", provider="gemini", name="Gemini 2.5 Flash", tags=["умная", "быстрая"], ctx="1M", vision=True),
    dict(id="openai/gpt-oss-120b", provider="groq", name="GPT-OSS 120B (Groq)", tags=["умная", "быстрая"], ctx="131K", vision=False),
    dict(id="deepseek/deepseek-chat-v3-0324:free", provider="openrouter", name="DeepSeek Chat V3", tags=["общая"], ctx="64K", vision=False),
    dict(id="qwen/qwen3-next-80b-a3b-instruct:free", provider="openrouter", name="Qwen3 Next 80B", tags=["общая", "умная"], ctx="262K", vision=False),
    dict(id="llama-3.3-70b-versatile", provider="groq", name="Llama 3.3 70B (Groq)", tags=["общая", "быстрая"], ctx="128K", vision=False),
    dict(id="cohere/north-mini-code:free", provider="openrouter", name="Cohere North Mini Code", tags=["код"], ctx="256K", vision=False),
    dict(id="meta-llama/llama-3.3-70b-instruct:free", provider="openrouter", name="Llama 3.3 70B", tags=["общая"], ctx="131K", vision=False),
    dict(id="gemini-2.5-flash-lite", provider="gemini", name="Gemini 2.5 Flash-Lite", tags=["быстрая"], ctx="1M", vision=True),
    dict(id="google/gemma-4-31b-it:free", provider="openrouter", name="Gemma 4 31B", tags=["общая"], ctx="262K", vision=True),
    dict(id="openai/gpt-oss-20b:free", provider="openrouter", name="GPT-OSS 20B", tags=["быстрая"], ctx="131K", vision=False),
    dict(id="openai/gpt-oss-20b", provider="groq", name="GPT-OSS 20B (Groq)", tags=["быстрая"], ctx="131K", vision=False),
    dict(id="qwen/qwen3-coder:free", provider="openrouter", name="Qwen3 Coder", tags=["код"], ctx="262K", vision=False),
    dict(id="llama-3.1-8b-instant", provider="groq", name="Llama 3.1 8B (Groq)", tags=["быстрая"], ctx="131K", vision=False),
    dict(id="gemini-2.0-flash", provider="gemini", name="Gemini 2.0 Flash", tags=["быстрая"], ctx="1M", vision=True),
    dict(id="liquid/lfm-3-1.7b:free", provider="openrouter", name="LFM-3 1.7B", tags=["быстрая"], ctx="262K", vision=False),
    dict(id="openrouter/free", provider="openrouter", name="OpenRouter Free (авто)", tags=["рулетка"], ctx="200K", vision=False),
    dict(id="pollinations/openai", provider="pollinations", name="GPT-OSS 20B (без ключа)", tags=["без ключа"], ctx="32K", vision=False),
]

for i, m in enumerate(MODELS, start=1):
    m["rank"] = i

MODELS_BY_ID = {m["id"]: m for m in MODELS}

PROFILES = {
    "auto": {"name": "Авто", "icon": "cycle", "desc": "все модели по очереди, от лучшей к худшей"},
    "light": {"name": "Лёгкие", "icon": "feather", "desc": "быстрые модели для идей и простых задач"},
    "strong": {"name": "Сильные", "icon": "diamond", "desc": "самые мощные для кода и сложных задач"},
}

PROFILE_IDS = {
    "light": [
        "gemini-2.5-flash-lite", "openai/gpt-oss-20b:free", "openai/gpt-oss-20b", "gemini-2.0-flash",
        "llama-3.1-8b-instant", "liquid/lfm-3-1.7b:free", "llama-3.3-70b-versatile",
        "deepseek/deepseek-chat-v3-0324:free", "google/gemma-4-31b-it:free", "openrouter/free",
        "gemini-2.5-flash",
    ],
    "strong": [
        "nvidia/nemotron-3-ultra-550b-a55b:free", "nvidia/nemotron-3-super-120b-a12b:free",
        "poolside/laguna-m.1:free", "openai/gpt-oss-120b:free", "deepseek/deepseek-v4-flash:free",
        "gemini-2.5-flash", "openai/gpt-oss-120b", "qwen/qwen3-next-80b-a3b-instruct:free",
        "qwen/qwen3-coder:free", "cohere/north-mini-code:free", "deepseek/deepseek-chat-v3-0324:free",
        "meta-llama/llama-3.3-70b-instruct:free",
    ],
}

PAID_IDS = set()
EXTRA_MODELS = []


def all_models():
    out = [dict(m) for m in MODELS]
    out.extend(dict(m) for m in EXTRA_MODELS)
    return out


async def refresh_openrouter():
    """Живой список бесплатных моделей OpenRouter (ключ не нужен)."""
    try:
        async with httpx.AsyncClient(timeout=15, headers={"User-Agent": "FreeNeuro/1.1"}) as c:
            r = await c.get("https://openrouter.ai/api/v1/models")
            data = r.json().get("data", [])
    except Exception:
        return {"ok": False, "added": 0}

    free_ids = set()
    api = {}
    for it in data:
        pid = it.get("id", "")
        api[pid] = it
        pr = it.get("pricing", {}) or {}
        modality = (it.get("architecture") or {}).get("modality") or "text"
        if "audio" in modality or any(k in pid for k in ("lyria", "tts", "whisper", "audio", "music", "image-gen", "flux", "sdxl")):
            continue
        if pid.endswith(":free") or (pr.get("prompt") == "0" and pr.get("completion") == "0" and "text" in modality):
            free_ids.add(pid)

    for m in MODELS:
        if m["provider"] == "openrouter" and m["id"] in api:
            if m["id"] in free_ids:
                PAID_IDS.discard(m["id"])
            elif not m["id"].endswith(":free"):
                PAID_IDS.add(m["id"])

    known = {m["id"] for m in MODELS} | {m["id"] for m in EXTRA_MODELS}
    added = 0
    for pid in sorted(free_ids):
        if pid not in known:
            modality = (api[pid].get("architecture") or {}).get("modality") or "text"
            vision = "image" in modality
            EXTRA_MODELS.append(dict(
                id=pid, provider="openrouter", name=(api[pid].get("name") or pid)[:60],
                tags=["новая"], ctx="?", rank=100 + len(EXTRA_MODELS), vision=vision,
            ))
            added += 1
    return {"ok": True, "added": added}


def serialize():
    return [{
        "id": m["id"],
        "name": m["name"],
        "provider": m["provider"],
        "provider_name": PROVIDERS[m["provider"]]["name"],
        "rank": m["rank"],
        "tags": m["tags"],
        "ctx": m["ctx"],
        "vision": bool(m.get("vision")),
        "key_field": PROVIDERS[m["provider"]]["key_field"],
        "paid": m["id"] in PAID_IDS,
    } for m in all_models()]

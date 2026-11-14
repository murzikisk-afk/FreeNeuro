# -*- coding: utf-8 -*-
"""FreeNeuro API v3: чат (SSE), песочница файлов, память, сжатие, проверка кастомных моделей."""
import json, os, time, urllib.parse
from pathlib import Path

import httpx
from fastapi import FastAPI, File, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles

import registry
import tools
import files as F
from providers import chat_stream, generate_once

app = FastAPI(title="FreeNeuro", version="1.2")
BASE = Path(__file__).parent
STATIC = BASE / "static"
MAX_UPLOAD = 50 * 1024 * 1024  # 50 МБ


@app.get("/")
async def root():
    return FileResponse(STATIC / "index.html")


@app.get("/api/health")
async def health():
    return {"ok": True, "app": "FreeNeuro", "v": "1.2"}


@app.get("/api/models")
async def models(refresh: int = 0):
    if refresh:
        await registry.refresh_openrouter()
    return {"profiles": registry.PROFILES, "profile_ids": registry.PROFILE_IDS,
            "models": registry.serialize(), "custom": registry.PROVIDERS["custom"]}


@app.get("/api/reset")
async def reset():
    from providers import COOLDOWNS, MODEL_COOLDOWN
    COLDOWNS_TMP = COOLDOWNS
    COOLDOWNS.clear()
    MODEL_COOLDOWN.clear()
    return {"ok": True}


# ---------------- память ----------------
@app.get("/api/memory")
async def mem_get():
    return {"items": tools._mem_load()}


@app.post("/api/memory")
async def mem_add(req: Request):
    body = await req.json()
    msg = tools.memory_add((body.get("text") or "").strip())
    return {"ok": True, "msg": msg}


@app.delete("/api/memory")
async def mem_clear():
    tools.memory_clear()
    return {"ok": True}


@app.delete("/api/memory/{idx}")
async def mem_remove(idx: int):
    tools.memory_remove(idx)
    return {"ok": True}


@app.post("/api/memory/compress")
async def mem_compress(req: Request):
    """Нейросеть сама сжимает память (объединяет, удаляет лишнее, оставляет нужное)."""
    body = await req.json()
    keys = body.get("keys") or {}
    items = tools._mem_load()
    if not items:
        return {"ok": True, "msg": "память пуста"}
    cur = "\n".join(f"- {i['text']}" for i in items)
    try:
        new = await generate_once(keys, [{"role": "user", "content":
            f"Сожми мою память: объедини повторы, удали неважное, сохрани нужное. "
            f"Ответь ТОЛЬКО JSON-списком строк (не больше 25).\nТекущая память:\n{cur}"}],
            system="Ты — компрессор памяти. Отвечай строго JSON-списком строк.", temperature=0.2)
        import re as _re
        arr = json.loads(_re.sub(r"^```[a-z]*\s*|\s*```$", "", new.strip(), flags=_re.S))
        arr = [str(x).strip()[:400] for x in arr if str(x).strip()]
        tools._mem_save([{"text": t, "ts": int(time.time())} for t in arr[:25]])
        return {"ok": True, "msg": f"память сжата: было {len(items)}, стало {len(arr)}", "items": tools._mem_load()}
    except Exception as e:
        return {"ok": False, "msg": f"сжатие не удалось: {e}"}


@app.post("/api/summarize")
async def summarize(req: Request):
    """Сжатие истории чата нейросетью."""
    body = await req.json()
    msgs = body.get("messages") or []
    keys = body.get("keys") or {}
    if not msgs:
        return {"ok": True, "summary": ""}
    text = "\n".join(f"{m.get('role')}: {m.get('content') if isinstance(m.get('content'), str) else '[файл]'}" for m in msgs)[:6000]
    try:
        s = await generate_once(keys, [{"role": "user", "content":
            f"Сожми этот диалог в краткое содержание (5-10 пунктов, факты, решения, договорённости). "
            f"Ответь только самим содержанием на русском:\n\n{text}"}],
            system="Ты сжимаешь историю чата. Отвечай только кратким содержанием.", temperature=0.2)
        return {"ok": True, "summary": s.strip()[:2000]}
    except Exception as e:
        return {"ok": False, "msg": str(e)}


# ---------------- песочница ----------------
@app.get("/api/sandbox")
async def sandbox_list(chat: str = "default"):
    return {"chat": chat, "files": F.list_tree(chat)}


@app.post("/api/sandbox/upload")
async def sandbox_upload(chat: str = "default", file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > MAX_UPLOAD:
        return JSONResponse({"ok": False, "msg": "файл больше 50 МБ"}, status_code=413)
    name = os.path.basename(file.filename or "file") or "file"
    if not name or name in (".", ".."):
        name = "file"
    p = F.write_bytes(chat, name, data)
    return {"ok": True, "name": name, "size": len(data),
            "path": p.relative_to(F.chat_dir(chat)).as_posix()}


@app.get("/api/sandbox/download")
async def sandbox_download(chat: str = "default", path: str = ""):
    p = F.safe_path(chat, path)
    if not p.exists() or not p.is_file():
        return JSONResponse({"ok": False, "msg": "файл не найден"}, status_code=404)
    return FileResponse(p, filename=p.name, media_type=F.mime_of(p))


@app.get("/api/sandbox/raw")
async def sandbox_raw(chat: str = "default", path: str = ""):
    p = F.safe_path(chat, path)
    if not p.exists():
        return JSONResponse({"ok": False, "msg": "не найден"}, status_code=404)
    if p.is_dir():
        return {"ok": False, "msg": "это папка"}
    return FileResponse(p, media_type=F.mime_of(p))


@app.delete("/api/sandbox")
async def sandbox_delete(chat: str = "default", path: str = ""):
    try:
        F.delete_path(chat, path)
        return {"ok": True}
    except Exception as e:
        return JSONResponse({"ok": False, "msg": str(e)}, status_code=400)


@app.post("/api/sandbox/move")
async def sandbox_move(req: Request, chat: str = "default"):
    body = await req.json()
    try:
        F.move_path(chat, body.get("from") or "", body.get("to") or "")
        return {"ok": True}
    except Exception as e:
        return JSONResponse({"ok": False, "msg": str(e)}, status_code=400)


# ---------------- проверка кастомных серверов ----------------
@app.post("/api/probe")
async def probe(req: Request):
    """GET {url}/models — какие модели есть на кастомном OpenAI-совместимом сервере."""
    body = await req.json()
    url = (body.get("url") or "").strip().rstrip("/")
    key = (body.get("key") or "").strip()
    if not url:
        return {"ok": False, "msg": "пустой адрес"}
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    headers = {"Authorization": f"Bearer {key}"} if key else {}
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as c:
            r = await c.get(url + "/models", headers=headers)
        if r.status_code != 200:
            return {"ok": False, "msg": f"HTTP {r.status_code}: {r.text[:200]}"}
        data = r.json().get("data", [])
        ids = sorted({m.get("id") for m in data if m.get("id")})
        return {"ok": True, "models": ids}
    except Exception as e:
        return {"ok": False, "msg": f"не удалось: {e}"}


# ---------------- чат ----------------
@app.post("/api/chat")
async def chat(req: Request):
    payload = await req.json()
    chat_id = (payload.get("chat") or "default")
    F.chat_dir(chat_id)  # гарантируем песочницу

    async def gen():
        queue = []

        async def push(ev):
            queue.append(ev)

        task = None

        async def run():
            await chat_stream(payload, push)
            queue.append({"t": "_end"})

        import asyncio
        task = asyncio.create_task(run())
        while True:
            if queue:
                ev = queue.pop(0)
                if ev.get("t") == "_end":
                    break
                yield "data: " + json.dumps(ev, ensure_ascii=False) + "\n\n"
            elif task.done():
                if task.exception():
                    yield "data: " + json.dumps({"t": "error", "v": str(task.exception())}, ensure_ascii=False) + "\n\n"
                break
            else:
                await asyncio.sleep(0.02)

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


app.mount("/static", StaticFiles(directory=STATIC), name="static")

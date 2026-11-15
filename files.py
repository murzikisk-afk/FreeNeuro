# -*- coding: utf-8 -*-
"""Песочница файлов + чтение файлов «как у современных нейросетей»."""
import base64, io, os, re, shutil, time, mimetypes
from pathlib import Path

SANDBOX_ROOT = Path(os.environ.get("SANDBOX_ROOT") or (Path(__file__).parent / "sandboxes"))
CHAT_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg"}
TEXT_EXTS = {".txt", ".md", ".markdown", ".py", ".js", ".ts", ".java", ".c", ".cpp", ".h",
             ".cs", ".go", ".rs", ".rb", ".php", ".sh", ".bat", ".html", ".htm", ".css",
             ".json", ".xml", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf", ".sql",
             ".csv", ".tsv", ".log", ".rtf", ".tex", ".kt", ".swift", ".lua", ".r", ".pl", ".ipynb"}
MAX_TEXT = 20000          # символов текста из файла в контекст
MAX_FILE = 25 * 1024 * 1024  # 25 МБ максимум на файл
MAX_IMG = 9 * 1024 * 1024    # 9 МБ на изображение для vision


def chat_dir(chat_id: str) -> Path:
    if not (chat_id and CHAT_RE.match(chat_id)):
        raise ValueError("неверный id чата")
    d = (SANDBOX_ROOT / chat_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


def safe_path(chat_id: str, rel: str) -> Path:
    base = chat_dir(chat_id).resolve()
    p = (base / (rel or "").replace("\\", "/")).resolve()
    if not (str(p) == str(base) or str(p).startswith(str(base) + os.sep)):
        raise ValueError("путь вне песочницы запрещён")
    return p


def list_tree(chat_id: str) -> list:
    out = []
    root = chat_dir(chat_id)
    for p in sorted(root.rglob("*")):
        if p.is_file():
            rel = p.relative_to(root).as_posix()
            st = p.stat()
            out.append({"path": rel, "name": p.name, "size": st.st_size,
                        "mtime": int(st.st_mtime), "ext": p.suffix.lower()})
    return out


def write_bytes(chat_id: str, rel: str, data: bytes) -> Path:
    p = safe_path(chat_id, rel)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(data)
    return p


def delete_path(chat_id: str, rel: str):
    p = safe_path(chat_id, rel)
    if p.is_dir():
        shutil.rmtree(p)
    else:
        p.unlink(missing_ok=True)


def move_path(chat_id: str, frm: str, to: str):
    src = safe_path(chat_id, frm)
    dst = safe_path(chat_id, to)
    if not src.exists():
        raise ValueError("файл не найден")
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))


def mime_of(path: Path) -> str:
    return mimetypes.guess_type(path.name)[0] or "application/octet-stream"


def is_image(rel: str) -> bool:
    return Path(rel).suffix.lower() in IMAGE_EXTS


def _read_text_file(p: Path) -> str:
    raw = p.read_bytes()
    if len(raw) > MAX_FILE:
        return f"[файл {p.name} слишком большой ({len(raw)} байт)]"
    for enc in ("utf-8", "utf-8-sig", "cp1251", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return f"[бинарный файл {p.name}, {len(raw)} байт]"


def extract_text(path: Path) -> str:
    """Чтение файла как у современных нейросетей: PDF/DOCX/XLSX/PPTX/CSV/код -> текст.
    Изображения возвращаются как image_data_uri. Большие файлы обрезаются."""
    ext = path.suffix.lower()
    name = path.name
    try:
        if ext == ".pdf":
            from pypdf import PdfReader
            rd = PdfReader(str(path))
            pages = [pg.extract_text() or "" for pg in rd.pages[:50]]
            txt = "\n\n".join(pages).strip()
            return txt[:MAX_TEXT] or "[в PDF нет текстового слоя — это скан]"
        if ext == ".docx":
            from docx import Document
            doc = Document(str(path))
            parts = [p.text for p in doc.paragraphs]
            for t in doc.tables:
                for row in t.rows:
                    parts.append(" | ".join(c.text for c in row.cells))
            return "\n".join(x for x in parts if x).strip()[:MAX_TEXT]
        if ext in (".xlsx", ".xlsm"):
            from openpyxl import load_workbook
            wb = load_workbook(str(path), read_only=True, data_only=True)
            out = []
            for ws in wb.worksheets[:3]:
                out.append(f"=== Лист: {ws.title} ===")
                for row in ws.iter_rows(values_only=True):
                    if any(v is not None for v in row):
                        out.append("\t".join("" if v is None else str(v) for v in row))
            return "\n".join(out)[:MAX_TEXT]
        if ext == ".pptx":
            from pptx import Presentation
            prs = Presentation(str(path))
            out = []
            for i, slide in enumerate(prs.slides, 1):
                out.append(f"--- Слайд {i} ---")
                for sh in slide.shapes:
                    if sh.has_text_frame:
                        t = sh.text_frame.text.strip()
                        if t:
                            out.append(t)
            return "\n".join(out)[:MAX_TEXT]
        if ext == ".ipynb":
            import json as _json
            nb = _json.loads(path.read_text("utf-8"))
            out = []
            for c in nb.get("cells", []):
                src = "".join(c.get("source", []))
                out.append(f"[{c.get('cell_type')}]\n{src}")
            return "\n\n".join(out)[:MAX_TEXT]
        if ext in TEXT_EXTS:
            return _read_text_file(path)[:MAX_TEXT]
        return f"[нечитаемый формат: {ext or 'без расширения'}]"
    except Exception as e:
        return f"[не удалось прочитать {name}: {e}]"


def image_data_uri(path: Path) -> str:
    raw = path.read_bytes()
    if len(raw) > MAX_IMG:
        raise ValueError(f"изображение {path.name} больше {MAX_IMG // 1048576} МБ")
    mime = mime_of(path)
    if not mime.startswith("image/"):
        mime = "image/png"
    return f"data:{mime};base64," + base64.b64encode(raw).decode()


def read_for_model(chat_id: str, rel: str):
    """Возвращает (text, [image_data_uri...]) — как современные нейросети читают файлы."""
    p = safe_path(chat_id, rel)
    if not p.exists():
        return f"[файл {rel} не найден в песочнице]", []
    if is_image(rel):
        return f"[изображение: {rel}]", [image_data_uri(p)]
    return extract_text(p), []


def describe_all(chat_id: str) -> str:
    files = list_tree(chat_id)
    if not files:
        return "песочница пуста"
    lines = [f"{f['path']} ({f['size']} байт)" for f in files]
    return "файлы песочницы:\n" + "\n".join(lines[:60])


def size_fmt(n: int) -> str:
    for u in ("Б", "КБ", "МБ", "ГБ"):
        if n < 1024:
            return f"{n:.0f} {u}" if u == "Б" else f"{n:.1f} {u}"
        n /= 1024
    return f"{n:.1f} ТБ"

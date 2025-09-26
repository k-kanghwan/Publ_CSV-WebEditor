VERSION = "v0.0.13"  # 2025.09.24 파일 순차적으로 읽게 수정
VERSION = "v0.0.14"  # 2025.09.24 검색 후 파일명 변경 기능 추가
VERSION = "v0.0.15"  # 2025.09.24 검색 후 파일명 변경 기능 추가
VERSION = "v0.0.20"  # 글로벌 검색 시, 매칭되는 항목이 없는 탭은 숨기도록 수정

import os
import sys

DEBUG_MODE = not getattr(sys, "frozen", False)


import pandas as pd
from pandas.errors import EmptyDataError

import uvicorn
import webbrowser

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

templates = Jinja2Templates(directory="static")

app = FastAPI()

# Resolve base path for both source and frozen (PyInstaller) builds
if getattr(sys, "frozen", False):
    base_path = sys._MEIPASS  # type: ignore[attr-defined]
else:
    base_path = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = r""
STATIC_DIR = os.path.join(base_path, "static")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def root(request: Request):
    return templates.TemplateResponse(
        "index.html", {"request": request, "version": VERSION}
    )
    # return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/favicon.ico")
async def favicon():
    return FileResponse(os.path.join(STATIC_DIR, "favicon.svg"))


@app.get("/files")
async def list_files():
    if not DATA_DIR or not os.path.isdir(DATA_DIR):
        return JSONResponse(
            {"warning": "Data directory not set or invalid"}, status_code=400
        )
    files = [f for f in os.listdir(DATA_DIR) if f.endswith(".csv")]
    return JSONResponse(files)


@app.get("/current_data_dir")
async def current_data_dir():
    return JSONResponse({"data_dir": DATA_DIR})


@app.get("/load/{filename}")
async def load_file(filename: str):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        return JSONResponse({"error": "File not found"}, status_code=404)
    try:
        df = pd.read_csv(path, dtype=str)
        df = df.fillna("")
        return JSONResponse(df.to_dict(orient="records"))
    except EmptyDataError:
        # Empty file: return empty list so frontend can show a blank table
        return JSONResponse([])


@app.post("/set_data_dir")
async def set_data_dir(request: Request):
    global DATA_DIR
    body = await request.json()
    new_dir = body.get("directory", "")
    if new_dir and os.path.isdir(new_dir):
        DATA_DIR = new_dir
        return JSONResponse({"status": "success", "data_dir": DATA_DIR})
    else:
        return JSONResponse({"error": "Invalid directory"}, status_code=400)


@app.post("/save/{filename}")
async def save_file(filename: str, request: Request):
    path = os.path.join(DATA_DIR, filename)
    data = await request.json()
    df = pd.DataFrame(data)
    df.to_csv(path, index=False, encoding="utf-8-sig")
    return JSONResponse({"status": "success"})


@app.post("/rename")
async def rename_file(request: Request):
    if not DATA_DIR or not os.path.isdir(DATA_DIR):
        return JSONResponse({"error": "Data directory invalid"}, status_code=400)
    body = await request.json()
    old = body.get("old") or ""
    new = body.get("new") or ""
    # Basic validation
    if not old or not new:
        return JSONResponse({"error": "Missing old or new filename"}, status_code=400)
    if os.path.sep in new or os.path.sep in old:
        return JSONResponse({"error": "Path separators not allowed"}, status_code=400)
    if not new.lower().endswith(".csv"):
        return JSONResponse(
            {"error": "New filename must end with .csv"}, status_code=400
        )
    old_path = os.path.join(DATA_DIR, old)
    new_path = os.path.join(DATA_DIR, new)
    if not os.path.exists(old_path):
        return JSONResponse({"error": "Original file not found"}, status_code=404)
    if os.path.exists(new_path):
        return JSONResponse(
            {"error": "Target filename already exists"}, status_code=409
        )
    try:
        os.rename(old_path, new_path)
        return JSONResponse({"status": "success", "old": old, "new": new})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


if __name__ == "__main__":
    print(f"Debug mode: {DEBUG_MODE}")
    default_port = 55131
    port = int(os.environ.get("PORT", default_port))
    print(f"Starting server on http://localhost:{port}")
    webbrowser.open(f"http://localhost:{port}")
    if DEBUG_MODE:
        # Reload requires an import string; use module:app in dev
        uvicorn.run("CsvEditor:app", host="127.0.0.1", port=port, reload=True)
    else:
        # In frozen executable, import-by-string can fail; pass the app object
        uvicorn.run(app, host="127.0.0.1", port=port, reload=False)

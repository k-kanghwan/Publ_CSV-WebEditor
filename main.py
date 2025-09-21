DEBUG_MODE = True


from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import pandas as pd
import os
import sys
import uvicorn
from fastapi.concurrency import run_in_threadpool

app = FastAPI()

# Resolve base path for both source and frozen (PyInstaller) builds
if getattr(sys, "frozen", False):
    base_path = sys._MEIPASS  # type: ignore[attr-defined]
else:
    base_path = os.path.dirname(os.path.abspath(__file__))

STATIC_DIR = os.path.join(base_path, "static")
DATA_DIR = os.path.join(base_path, "data")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def root():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/favicon.ico")
async def favicon():
    return FileResponse(os.path.join(STATIC_DIR, "favicon.svg"))


@app.get("/files")
async def list_files():
    files = [f for f in os.listdir(DATA_DIR) if f.endswith(".csv")]
    return JSONResponse(files)


@app.get("/current_data_dir")
async def current_data_dir():
    return JSONResponse({"data_dir": DATA_DIR})


@app.post("/set_data_dir")
async def set_data_dir(request: Request):
    body = await request.json()
    path = body.get("path", "")
    if not path or not os.path.isdir(path):
        return JSONResponse({"error": "Invalid directory"}, status_code=400)
    global DATA_DIR
    DATA_DIR = path
    return JSONResponse({"data_dir": DATA_DIR})


def _choose_dir_dialog():
    import tkinter as tk
    from tkinter import filedialog

    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    selected = filedialog.askdirectory(title="Select data folder")
    root.destroy()
    return selected or ""


@app.post("/choose_data_dir")
async def choose_data_dir():
    selected = await run_in_threadpool(_choose_dir_dialog)
    if not selected:
        return JSONResponse({"error": "No folder selected"}, status_code=400)
    if not os.path.isdir(selected):
        return JSONResponse({"error": "Invalid folder"}, status_code=400)
    global DATA_DIR
    DATA_DIR = selected
    return JSONResponse({"data_dir": DATA_DIR})


@app.get("/load/{filename}")
async def load_file(filename: str):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        return JSONResponse({"error": "File not found"}, status_code=404)
    df = pd.read_csv(path)
    return JSONResponse(df.to_dict(orient="records"))


@app.post("/save/{filename}")
async def save_file(filename: str, request: Request):
    path = os.path.join(DATA_DIR, filename)
    data = await request.json()
    df = pd.DataFrame(data)
    df.to_csv(path, index=False, encoding="utf-8-sig")
    return JSONResponse({"status": "success"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=DEBUG_MODE)

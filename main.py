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


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=DEBUG_MODE)

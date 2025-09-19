from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import pandas as pd
import os

app = FastAPI()
DATA_DIR = "data"

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    return FileResponse("static/index.html")


@app.get("/files")
async def list_files():
    files = [f for f in os.listdir(DATA_DIR) if f.endswith(".csv")]
    return JSONResponse(files)


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

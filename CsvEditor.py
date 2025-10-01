VERSION = "v0.0.13"  # 2025.09.24 파일 순차적으로 읽게 수정
VERSION = "v0.0.14"  # 2025.09.24 검색 후 파일명 변경 기능 추가
VERSION = "v0.0.15"  # 2025.09.24 검색 후 파일명 변경 기능 추가
VERSION = "v0.0.20"  # 글로벌 검색 시, 매칭되는 항목이 없는 탭은 숨기도록 수정
VERSION = "v0.0.21"  # 글로벌 검색 후 엑셀 다운로드 기능 추가
VERSION = "v0.0.22"  # 2025.10.01 엑셀 다운로드 시, 파일명에 날짜/시간 추가

import os
import sys

DEBUG_MODE = not getattr(sys, "frozen", False)


import pandas as pd
from pandas.errors import EmptyDataError
from io import BytesIO
import tempfile
from datetime import datetime

import uvicorn
import webbrowser

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# Resolve base path for both source and frozen (PyInstaller) builds
if getattr(sys, "frozen", False):
    base_path = sys._MEIPASS  # type: ignore[attr-defined]
else:
    base_path = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = r""
STATIC_DIR = os.path.join(base_path, "static")

# Templates not needed - using direct file serving

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def root(request: Request):
    # Use FileResponse for better compatibility with PyInstaller
    template_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(template_path):
        # Read the file and replace the version placeholder
        with open(template_path, "r", encoding="utf-8") as f:
            content = f.read()
        content = content.replace("{{ version }}", VERSION)
        from starlette.responses import HTMLResponse

        return HTMLResponse(content)
    else:
        return JSONResponse({"error": "Template not found"}, status_code=404)


@app.get("/favicon.ico")
async def favicon():
    favicon_path = os.path.join(STATIC_DIR, "favicon.svg")
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path)
    else:
        # Return 404 if favicon doesn't exist
        return JSONResponse({"error": "Favicon not found"}, status_code=404)


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


@app.post("/download_excel")
async def download_excel(request: Request):
    print("Starting Excel download...")
    try:
        body = await request.json()
        tables_data = body.get("tables", [])

        if not tables_data:
            return JSONResponse({"error": "No data to export"}, status_code=400)

        # Create Excel file in memory
        output = BytesIO()

        # Combine all tables into one sheet
        combined_data = []

        for table_info in tables_data:
            filename = table_info.get("filename", "Unknown")
            rows = table_info.get("data", [])

            for row in rows:
                # Add filename to each row
                row_with_filename = row.copy()
                row_with_filename["파일명"] = filename
                combined_data.append(row_with_filename)

        if combined_data:
            df = pd.DataFrame(combined_data)
            # Move filename column to the end
            if "파일명" in df.columns:
                cols = [col for col in df.columns if col != "파일명"] + ["파일명"]
                df = df[cols]

            with pd.ExcelWriter(output, engine="openpyxl") as writer:
                df.to_excel(writer, sheet_name="Combined Data", index=False)

        output.seek(0)

        # Generate filename with current date and time
        current_time = datetime.now()
        timestamp = current_time.strftime("%y%m%d_%H%M%S")
        filename = f"csv_editor_export-{timestamp}.xlsx"

        return StreamingResponse(
            BytesIO(output.read()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

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

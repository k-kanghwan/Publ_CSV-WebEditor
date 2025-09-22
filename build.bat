@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM Navigate to script directory (project root)
cd /d "%~dp0"

REM Optional: create and activate a virtual environment
if not exist .venv (
  echo Creating virtual environment...
  py -3 -m venv .venv
)
call .venv\Scripts\activate

REM Install dependencies (online or offline via WHEEL_DIR / wheelhouse)
if defined WHEEL_DIR (
  echo Using offline wheels from: %WHEEL_DIR%
  python -m pip install --no-index --find-links "%WHEEL_DIR%" -r requirements.txt 2>nul || (
    echo Falling back to minimal offline install...
    python -m pip install --no-index --find-links "%WHEEL_DIR%" fastapi uvicorn[standard] pandas
  )
  python -m pip install --no-index --find-links "%WHEEL_DIR%" pyinstaller
) else if exist wheelhouse (
  set "WHEEL_DIR=%CD%\wheelhouse"
  echo Using offline wheels from: %WHEEL_DIR%
  python -m pip install --no-index --find-links "%WHEEL_DIR%" -r requirements.txt 2>nul || (
    echo Falling back to minimal offline install...
    python -m pip install --no-index --find-links "%WHEEL_DIR%" fastapi uvicorn[standard] pandas
  )
  python -m pip install --no-index --find-links "%WHEEL_DIR%" pyinstaller
) else (
  python -m pip install --upgrade pip
  if exist requirements.txt (
    echo Installing requirements...
    pip install -r requirements.txt
  ) else (
    echo requirements.txt not found, installing minimal packages...
    pip install fastapi uvicorn[standard] pandas
  )
  pip install --upgrade pyinstaller
)

REM Clean previous builds
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist CsvEditor.spec del /q CsvEditor.spec

REM Build options
set NAME=CsvEditor
set MAIN=CsvEditor.py
set DATA=static;static
set EXCLUDES=--exclude-module PyQt5 --exclude-module PyQt5.sip --exclude-module PyQt6 --exclude-module PySide2 --exclude-module PySide6

REM Build onefile executable including static assets
py -3 -m PyInstaller --noconfirm --clean --name %NAME% --add-data "%DATA%" %EXCLUDES% --onefile %MAIN%

if errorlevel 1 (
  echo Build failed.
  exit /b 1
)

echo.
echo Build complete: dist\%NAME%.exe
pause

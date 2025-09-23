

@echo off
setlocal ENABLEDELAYEDEXPANSION

REM Clean previous artifacts (optional)
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

REM Build using the PyInstaller spec file
pyinstaller "CsvEditor.spec"

echo.
echo Build completed. Output is under the dist folder.
pause
endlocal



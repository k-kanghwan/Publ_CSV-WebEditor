@REM pyinstaller --add-data "static;static" --name CsvEditor --exclude-module PyQt5 --exclude-module PyQt5.sip --exclude-module PyQt6 --exclude-module PySide2 --exclude-module PySide6 --icon=ico/favicon.ico CsvEditor.py


pyinstaller --onefile --icon "static\img\favicon.ico" --add-data "static;static" --name CsvEditor ^
  --runtime-tmpdir "%LOCALAPPDATA%\CsvEditor\.run" ^
  --exclude-module PyQt5 --exclude-module PyQt5.sip --exclude-module PyQt6 --exclude-module PySide2 --exclude-module PySide6 CsvEditor.py

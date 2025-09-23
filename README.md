# CSV Web Editor

A web-based CSV file editor built with FastAPI and vanilla JavaScript. This application provides an intuitive interface for viewing, editing, and saving CSV files through a web browser.

## Features

- 🌐 **Web-based Interface**: Edit CSV files directly in your browser
- 📁 **Directory Management**: Set and change data directories dynamically
- 🔍 **File Search**: Quick search functionality to find CSV files
- 📊 **Table Editor**: Interactive table interface for editing CSV data
- 💾 **Auto-save**: Save changes back to CSV files with UTF-8-BOM encoding
- 🖥️ **Standalone Executable**: Can be built as a standalone Windows application using PyInstaller

## Technology Stack

- **Backend**: FastAPI with Uvicorn server
- **Data Processing**: Pandas for CSV handling
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Packaging**: PyInstaller for creating executables

## Installation

### Option 1: Run from Source

1. Clone this repository:
```bash
git clone https://github.com/k-kanghwan/Publ_web_csv_editor.git
cd Publ_web_csv_editor
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the application:
```bash
python CsvEditor.py
```

The application will automatically open in your default web browser at `http://localhost:55131`.

### Option 2: Use Pre-built Executable

1. Download the latest executable from the releases section
2. Run `CsvEditor 0.0.1.exe`
3. The application will start and open in your browser automatically

## Usage

1. **Set Data Directory**: Click "Set Data Directory" to choose the folder containing your CSV files
2. **Browse Files**: All CSV files in the selected directory will be listed
3. **Search Files**: Use the search box to quickly find specific files
4. **Load File**: Select a file and click "Load" to open it in the editor
5. **Edit Data**: Click on any cell to edit its content
6. **Save Changes**: Modified data is automatically saved back to the CSV file

## Building from Source

To create a standalone executable:

```bash
# Run the build script
build_spec.bat
```

This will create an executable in the `build/CsvEditor/` directory using PyInstaller.

## Project Structure

```
├── CsvEditor.py          # Main FastAPI application
├── CsvEditor.spec        # PyInstaller specification
├── build_spec.bat        # Build script for creating executable
├── requirements.txt      # Python dependencies
├── static/              # Frontend assets
│   ├── index.html       # Main HTML interface
│   ├── script.js        # JavaScript functionality
│   ├── style.css        # Styling
│   └── img/            # Images and icons
├── ico/                # Application icons
└── test/               # Sample CSV files for testing
    ├── data1/          # Test dataset 1
    ├── data2/          # Test dataset 2
    └── data3-many/     # Large test dataset
```

## API Endpoints

- `GET /` - Serve the main HTML interface
- `GET /files` - List all CSV files in the current data directory
- `GET /current_data_dir` - Get the current data directory path
- `GET /load/{filename}` - Load and return CSV file data as JSON
- `POST /set_data_dir/{new_dir}` - Set a new data directory
- `POST /save/{filename}` - Save modified data back to CSV file

## Configuration

- **Default Port**: 55131 (can be changed via `PORT` environment variable)
- **Encoding**: CSV files are saved with UTF-8-BOM encoding
- **Debug Mode**: Automatically enabled when running from source

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Version History

- **v0.0.1** (2025.09.23) - Initial release
  - Basic CSV editing functionality
  - Web interface
  - Directory management
  - File search and filtering
  - Standalone executable support
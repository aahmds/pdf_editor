# 📄 PDF Editor
> ⚠️ **This project is a lab / work in progress.** Features may be incomplete, unstable, or subject to change.
A full-featured, modern PDF editor that runs entirely in the browser. No files are uploaded to any server — all processing happens client-side.
## Features
**Document Editing**
- Add text with font selection (Helvetica, Times, Courier), size, and color
- Insert handwritten signatures (drawn on canvas) with a saved signature library
- Add checkboxes and form fields
- Freehand drawing on the document
- Redaction (mask sensitive areas)
- Annotation system with a dedicated side panel
**File Handling**
- Import via drag & drop or file picker
- Supported formats: PDF, Images (PNG, JPG, WEBP), Documents (TXT, DOCX)
- Automatic conversion of non-PDF formats to PDF on import
**PDF Operations**
- Merge multiple PDF / image / document files
- Split a PDF (extract a page range)
- Password protection
- Optical Character Recognition (OCR) via Tesseract.js
- Export pages as images
- Preview before saving
**Interface**
- Page navigation with thumbnail sidebar
- Configurable zoom with presets
- Dark mode
- Undo / Redo
- Save and download the modified PDF
## Tech Stack
- **React 18** + **TypeScript**
- **Vite** — bundler and dev server
- **pdf-lib** — client-side PDF manipulation and generation
- **pdfjs-dist** (PDF.js) — PDF page rendering and display
- **Tesseract.js** — Optical Character Recognition (OCR)
- **react-signature-canvas** — handwritten signature capture
- **mammoth.js** — DOCX file conversion
- **file-saver** — generated file download
## Project Structure
```
src/
├── main.tsx                          # Entry point
├── App.tsx                           # Root component
├── App.css / index.css               # Styles
├── components/
│   ├── Editor.tsx                    # Main editor component
│   ├── Toolbar.tsx                   # Toolbar
│   ├── PdfViewer.tsx                 # PDF page display
│   ├── FileDropzone.tsx              # Drag & drop zone
│   ├── PageThumbnails.tsx            # Page thumbnails (sidebar)
│   ├── AnnotationPanel.tsx           # Annotation panel
│   ├── SignatureModal.tsx            # Signature creation modal
│   ├── SignatureLibrary.tsx          # Saved signatures library
│   ├── TextInputModal.tsx            # Text input modal
│   └── DrawingCanvas.tsx            # Freehand drawing canvas
├── hooks/
│   └── usePdfEditor.ts              # Main hook (editor logic)
└── utils/
    ├── pdfUtils.ts                   # General PDF utilities
    ├── pdfOperations.ts              # Operations (merge, split, protect, OCR)
    ├── fileConverter.ts              # Format conversion (DOCX, images, TXT → PDF)
    └── signatureStorage.ts           # Local signature storage
```
## Installation
```bash
# Clone the repository
git clone <repo-url>
cd pdf_editor
# Install dependencies
npm install
# Start the development server
npm run dev
```
The app will be available at `http://localhost:5173`.
## Production Build
```bash
npm run build
```
Optimized files will be generated in the `dist/` folder.
## Usage
1. Open the app in your browser
2. Drag & drop a file (PDF, image, or document) or click "Select a file"
3. Use the toolbar to edit the document (text, signature, drawing, etc.)
4. Click "Save" to download the modified PDF
## License
This project is licensed under the MIT License.

# Docs.modif.in
---

# 1. PDF Manipulation
Tools for altering the structure and pages of PDF files.

1. **PDF Merger**
    * Combine multiple PDFs into a single file
    * Reorder files before merging
2. **PDF Splitter**
    * Split by page range
    * Extract all pages into separate files
3. **Page Organizer**
    * Delete specific pages
    * Reorder pages via drag-and-drop
    * Rotate individual or all pages
    * Duplicate pages
    * Crop page margins or select a specific print area

---

# 2. Document Conversion
Bidirectional converters bridging formats like DOCX, PDF, and presentations.

1. **To PDF**
    * Word (DOC/DOCX) to PDF
    * Excel (XLS/XLSX) to PDF
    * PowerPoint (PPT/PPTX) to PDF
    * Markdown to PDF
    * Text/RTF to PDF
    * Image (JPG/PNG) to PDF
    * Webpage (URL/HTML) to PDF
2. **From PDF**
    * PDF to Word (DOCX)
    * PDF to Excel (XLSX)
    * PDF to PowerPoint (PPTX)
    * PDF to Images (JPG/PNG)
3. **E-Book Conversion**
    * EPUB to PDF
    * PDF to EPUB
    * MOBI ↔ EPUB
4. **Archival Conversion**
    * PDF to PDF/A (long-term-preservation standard)

---

# 3. Data & CSV Utilities
Tools dedicated to tabular data manipulation and formatting.

1. **CSV Converter**
    * CSV ↔ JSON
    * CSV ↔ XML
    * CSV ↔ Excel (XLSX)
2. **CSV Editor & Transformer**
    * Merge multiple CSV files
    * Split large CSV files by row count
    * Filter rows based on column values
    * Remove duplicate rows
    * Change CSV delimiter (Comma, Tab, Pipe, Semicolon)
3. **Table to Markdown**
    * Convert CSV to Markdown tables
    * Convert HTML tables to CSV/Markdown


---

# 4. Extraction & OCR
Tools for pulling specific assets or raw data out of compiled documents.

1. **OCR (Optical Character Recognition)**
    * Scanned/image-based PDF to searchable, selectable PDF
    * Scanned PDF to plain text (via OCR)
2. **Asset Extractor**
    * Extract all images from a PDF
    * Extract all images from a DOCX/PPTX
    * Extract fonts from a PDF
3. **Text Extractor**
    * Strip formatting and extract raw plain text directly from digitally-native PDF/DOCX (no OCR needed)
4. **Table Extractor**
    * Detect tables inside a PDF
    * Export detected tables as CSV or XLSX

---

# 5. Editing, Forms & Signatures
Tools that modify a document's actual content rather than just its structure or format.

1. **PDF Editor**
    * Add or edit text, images, and shapes
    * Highlight, underline, and freehand annotate
    * Add comments/notes
2. **Fillable Form Tools**
    * Auto-detect form fields in a PDF
    * Create interactive fillable forms (text fields, checkboxes, multiple choice, dropdowns)
    * Fill out existing PDF forms
3. **E-Signature**
    * Draw, type, or upload a signature
    * Place signature/initials on a document
    * Request a signature from someone else
4. **Document Comparison**
    * Side-by-side view of two document versions (PDF/DOCX)
    * Highlight added, removed, and changed content

---

# 6. Security & Metadata
Utilities for protecting files and ensuring digital privacy.

1. **PDF Security**
    * Protect PDF (Add password & restrict printing/editing)
    * Unlock PDF (Remove known password)
2. **Redaction Tool**
    * Permanently black out and remove sensitive text or graphics
3. **Watermarking**
    * Add text watermark (Draft, Confidential, custom text)
    * Add image/logo watermark
    * Stamp PDF (Add approval stamps/signatures)
4. **Metadata Stripper**
    * View document metadata (Author, creation date, software)
    * Sanitize/Remove metadata from PDF and DOCX

---

# 7. Optimization & Formatting
Tools to finalize documents for distribution or printing.

1. **PDF Compressor**
    * Reduce file size (Web, Print, or Custom quality profiles)
2. **PDF Flattening**
    * Flatten interactive fillable forms into static read-only text
    * Flatten annotations and comments
3. **Pagination & Layout**
    * Add page numbers
    * Add Headers & Footers
    * Add margins/padding to pages
4. **Repair Document**
    * Recover data from corrupted PDF files
5. **Batch Workflow Automation**
    * Chain multiple tools into one reusable action (e.g., Compress → Watermark → Add page numbers)
    * Apply the same workflow across a whole batch of files

---

# Final Site Structure

```text
DOCUMENTS TOOLBOX
│
├── PDF Manipulation
│   ├── PDF Merger
│   ├── PDF Splitter
│   └── Page Organizer (incl. Crop)
│
├── Document Conversion
│   ├── To PDF (Word, Excel, Markdown, Image, Webpage)
│   ├── From PDF (Word, Excel, PPT, Images)
│   ├── E-Book Conversion
│   └── Archival Conversion (PDF/A)
│
├── Data & CSV Utilities
│   ├── CSV Converter (JSON, XML, XLSX)
│   ├── CSV Editor & Transformer
│   └── Table to Markdown
│
├── Extraction & OCR
│   ├── OCR Engine
│   ├── Asset Extractor
│   ├── Text Extractor
│   └── Table Extractor
│
├── Editing, Forms & Signatures
│   ├── PDF Editor
│   ├── Fillable Form Tools
│   ├── E-Signature
│   └── Document Comparison
│
├── Security & Metadata
│   ├── PDF Security (Lock/Unlock)
│   ├── Redaction Tool
│   ├── Watermarking
│   └── Metadata Stripper
│
└── Optimization & Formatting
    ├── PDF Compressor
    ├── PDF Flattening
    ├── Pagination & Layout
    ├── Repair Document
    └── Batch Workflow Automation
```
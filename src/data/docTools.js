import { createTool } from "./createTool.js";

const PREFIX = "doc";

// Curated common tasks; see docs/popular-tools.md for selection criteria.
export const docPopularToolOrder = [
    "pdf-merger",
    "pdf-compressor",
    "pdf-splitter",
    "to-pdf",
    "from-pdf",
    "pdf-editor",
    "e-signature",
    "ocr",
];

const popularToolIds = new Set(docPopularToolOrder);
const tool = (id, name, category) =>
    createTool(PREFIX, id, name, category, popularToolIds.has(id));

export const docToolsData = [
    {
        id: "pdf-manipulation",
        name: "PDF Manipulation",
        tools: [
            tool("pdf-merger", "PDF Merger", "PDF Manipulation"),
            tool("pdf-splitter", "PDF Splitter", "PDF Manipulation"),
            tool("page-organizer", "Page Organizer", "PDF Manipulation"),
        ],
    },
    {
        id: "optimization-formatting",
        name: "Optimization & Formatting",
        tools: [
            tool(
                "pdf-compressor",
                "PDF Compressor",
                "Optimization & Formatting",
            ),
            tool("pdf-flattening", "PDF Flattening", "Optimization & Formatting"),
            tool(
                "pagination-layout",
                "Pagination & Layout",
                "Optimization & Formatting",
            ),
            tool("repair-document", "Repair Document", "Optimization & Formatting"),
            tool(
                "batch-workflow-automation",
                "Batch Workflow Automation",
                "Optimization & Formatting",
            ),
        ],
    },
    {
        id: "document-conversion",
        name: "Document Conversion",
        tools: [
            tool("to-pdf", "To PDF", "Document Conversion"),
            tool("from-pdf", "From PDF", "Document Conversion"),
            tool("ebook-conversion", "E-Book Conversion", "Document Conversion"),
            tool("archival-conversion", "Archival Conversion", "Document Conversion"),
        ],
    },
    {
        id: "editing-forms-signatures",
        name: "Editing, Forms & Signatures",
        tools: [
            tool("pdf-editor", "PDF Editor", "Editing, Forms & Signatures"),
            tool("e-signature", "E-Signature", "Editing, Forms & Signatures"),
            tool(
                "fillable-form-tools",
                "Fillable Form Tools",
                "Editing, Forms & Signatures",
            ),
            tool(
                "document-comparison",
                "Document Comparison",
                "Editing, Forms & Signatures",
            ),
        ],
    },
    {
        id: "extraction-ocr",
        name: "Extraction & OCR",
        tools: [
            tool("ocr", "OCR (Optical Character Recognition)", "Extraction & OCR"),
            tool("text-extractor", "Text Extractor", "Extraction & OCR"),
            tool("table-extractor", "Table Extractor", "Extraction & OCR"),
            tool("asset-extractor", "Asset Extractor", "Extraction & OCR"),
        ],
    },
    {
        id: "security-metadata",
        name: "Security & Metadata",
        tools: [
            tool("redaction-tool", "Redaction Tool", "Security & Metadata"),
            tool("watermarking", "Watermarking", "Security & Metadata"),
            tool("pdf-security", "PDF Security", "Security & Metadata"),
            tool("metadata-stripper", "Metadata Stripper", "Security & Metadata"),
        ],
    },
    {
        id: "data-csv-utilities",
        name: "Data & CSV Utilities",
        tools: [
            tool("csv-converter", "CSV Converter", "Data & CSV Utilities"),
            tool(
                "csv-editor-transformer",
                "CSV Editor & Transformer",
                "Data & CSV Utilities",
            ),
            tool("table-to-markdown", "Table to Markdown", "Data & CSV Utilities"),
        ],
    },
];

const PREFIX = "doc";

function tool(id, name, category, isPopular = false) {
    return {
        id,
        name,
        category,
        isPopular,
        path: `/${PREFIX}/${id}`,
    };
}

export const docToolsData = [
    {
        id: "pdf-manipulation",
        name: "PDF Manipulation",
        tools: [
            tool("pdf-merger", "PDF Merger", "PDF Manipulation", true),
            tool("pdf-splitter", "PDF Splitter", "PDF Manipulation"),
            tool("page-organizer", "Page Organizer", "PDF Manipulation"),
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
    {
        id: "extraction-ocr",
        name: "Extraction & OCR",
        tools: [
            tool("ocr", "OCR (Optical Character Recognition)", "Extraction & OCR", true),
            tool("asset-extractor", "Asset Extractor", "Extraction & OCR"),
            tool("text-extractor", "Text Extractor", "Extraction & OCR"),
            tool("table-extractor", "Table Extractor", "Extraction & OCR"),
        ],
    },
    {
        id: "editing-forms-signatures",
        name: "Editing, Forms & Signatures",
        tools: [
            tool("pdf-editor", "PDF Editor", "Editing, Forms & Signatures"),
            tool(
                "fillable-form-tools",
                "Fillable Form Tools",
                "Editing, Forms & Signatures",
            ),
            tool("e-signature", "E-Signature", "Editing, Forms & Signatures"),
            tool(
                "document-comparison",
                "Document Comparison",
                "Editing, Forms & Signatures",
            ),
        ],
    },
    {
        id: "security-metadata",
        name: "Security & Metadata",
        tools: [
            tool("pdf-security", "PDF Security", "Security & Metadata"),
            tool("redaction-tool", "Redaction Tool", "Security & Metadata"),
            tool("watermarking", "Watermarking", "Security & Metadata"),
            tool("metadata-stripper", "Metadata Stripper", "Security & Metadata"),
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
                true,
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
];

import { useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../../text/_shared/CopyButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { downloadBlob, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { loadPdfWithPdfJs } from "../_shared/pdfUtils";
import { formatExtractedTable, rowsFromPages } from "./tableRows";

async function extractTables(buffer) {
    const pdf = await loadPdfWithPdfJs(buffer);
    const pages = [];

    for (let i = 1; i <= pdf.numPages; i += 1) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const items = [];
        content.items.forEach((item) => {
            if (item.str.trim()) {
                items.push({
                    text: item.str,
                    x: item.transform[4],
                    y: item.transform[5],
                });
            }
        });
        pages.push(items);
        page.cleanup();
    }

    pdf.destroy();
    return rowsFromPages(pages);
}

function TableExtractor() {
    const [rows, setRows] = useState(null);
    const [format, setFormat] = useState("csv");
    const [status, setStatus] = useState("");
    const output = rows ? formatExtractedTable(rows, format) : "";

    const handleFile = async (files) => {
        const file = files[0];
        if (!file) return;

        setStatus("Detecting table structure…");
        try {
            const buffer = await readFileAsArrayBuffer(file);
            const result = await extractTables(buffer);
            setRows(result);
            setStatus("Table extracted successfully.");
        } catch (error) {
            setStatus(error?.message ?? "Extraction failed.");
        }
    };

    return (
        <DocToolShell
            title="Table Extractor"
            description="Detect grid-aligned text in PDFs and export as CSV or JSON."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    onFiles={handleFile}
                    label="Drop a PDF file"
                />
                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className={`doc-tool-button cursor-target${format === "csv" ? " is-active" : ""}`}
                        onClick={() => setFormat("csv")}
                    >
                        CSV
                    </button>
                    <button
                        type="button"
                        className={`doc-tool-button cursor-target${format === "json" ? " is-active" : ""}`}
                        onClick={() => setFormat("json")}
                    >
                        JSON
                    </button>
                </div>
            </div>

            {output ? (
                <div className="doc-tool-panel">
                    <div className="doc-tool-output-header">
                        <h2 className="doc-tool-section-title">Extracted Table</h2>
                        <div className="doc-tool-controls">
                            <CopyButton text={output} />
                            <button
                                type="button"
                                className="doc-tool-button cursor-target"
                                onClick={() =>
                                    downloadBlob(
                                        new Blob([output], { type: "text/plain" }),
                                        `table.${format}`,
                                    )
                                }
                            >
                                Download
                            </button>
                        </div>
                    </div>
                    <textarea className="doc-tool-textarea" value={output} readOnly />
                </div>
            ) : null}

            {status ? <p className="doc-tool-status">{status}</p> : null}
        </DocToolShell>
    );
}

export default TableExtractor;

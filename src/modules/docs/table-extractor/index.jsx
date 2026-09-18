import { useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../../text/_shared/CopyButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { toCsv } from "../_shared/csvUtils";
import { downloadBlob, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { loadPdfWithPdfJs } from "../_shared/pdfUtils";

function groupIntoTable(textItems) {
    if (!textItems.length) return [];

    const sorted = [...textItems].sort((a, b) => {
        const yDiff = b.y - a.y;
        if (Math.abs(yDiff) > 5) return yDiff;
        return a.x - b.x;
    });

    const rows = [];
    let currentRow = [];
    let currentY = sorted[0]?.y ?? 0;

    for (const item of sorted) {
        if (Math.abs(item.y - currentY) > 8) {
            if (currentRow.length) rows.push(currentRow);
            currentRow = [item];
            currentY = item.y;
        } else {
            currentRow.push(item);
        }
    }
    if (currentRow.length) rows.push(currentRow);

    const columnPositions = [];
    rows.forEach((row) => {
        row.forEach((cell) => {
            const existing = columnPositions.find((x) => Math.abs(x - cell.x) < 15);
            if (!existing) columnPositions.push(cell.x);
        });
    });
    columnPositions.sort((a, b) => a - b);

    return rows.map((row) => {
        const cells = columnPositions.map(() => "");
        row.forEach((cell) => {
            const colIndex = columnPositions.findIndex((x) => Math.abs(x - cell.x) < 15);
            if (colIndex >= 0) {
                cells[colIndex] = cells[colIndex]
                    ? `${cells[colIndex]} ${cell.text}`
                    : cell.text;
            }
        });
        return cells;
    });
}

async function extractTables(buffer) {
    const pdf = await loadPdfWithPdfJs(buffer);
    const allItems = [];

    for (let i = 1; i <= pdf.numPages; i += 1) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        content.items.forEach((item) => {
            if (item.str.trim()) {
                allItems.push({
                    text: item.str,
                    x: item.transform[4],
                    y: item.transform[5],
                });
            }
        });
        page.cleanup();
    }

    pdf.destroy();
    const table = groupIntoTable(allItems);
    if (!table.length) return { csv: "", json: "[]" };

    const headers = table[0].map((_, i) => `Column ${i + 1}`);
    const data = table.map((row) => {
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = row[i] ?? "";
        });
        return obj;
    });

    return {
        csv: toCsv(data),
        json: JSON.stringify(data, null, 2),
    };
}

function TableExtractor() {
    const [output, setOutput] = useState("");
    const [format, setFormat] = useState("csv");
    const [status, setStatus] = useState("");

    const handleFile = async (files) => {
        const file = files[0];
        if (!file) return;

        setStatus("Detecting table structure…");
        try {
            const buffer = await readFileAsArrayBuffer(file);
            const result = await extractTables(buffer);
            setOutput(format === "csv" ? result.csv : result.json);
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

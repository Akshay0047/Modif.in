import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { downloadText } from "../_shared/downloadUtils";
import { getBaseName, readFileAsArrayBuffer } from "../_shared/fileUtils";
import { extractTextFromPdf } from "../_shared/pdfUtils";
import { detectTableFromTextItems, tableToCsv } from "../_shared/tableDetection";

function TableExtractor() {
    const [csv, setCsv] = useState("");
    const [json, setJson] = useState("");
    const [filename, setFilename] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleFile = async (files) => {
        const file = files[0];
        if (!file) return;
        setLoading(true);
        setError("");
        try {
            const buffer = await readFileAsArrayBuffer(file);
            const { pages } = await extractTextFromPdf(buffer);
            const allItems = pages.flatMap((page) => page.items);
            const { headers, rows } = detectTableFromTextItems(allItems);
            if (!headers.length) throw new Error("No table structure detected in this PDF.");
            setCsv(tableToCsv(headers, rows));
            setJson(JSON.stringify({ headers, rows }, null, 2));
            setFilename(getBaseName(file.name));
        } catch (extractError) {
            setError(extractError instanceof Error ? extractError.message : "Table extraction failed.");
            setCsv("");
            setJson("");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DocToolShell
            title="Table Extractor"
            description="Detect grid-aligned text in PDFs and export structured CSV or JSON tables."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    label="Drop a PDF with tabular content"
                    onFiles={handleFile}
                    disabled={loading}
                />

                {csv ? (
                    <>
                        <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                            <button
                                type="button"
                                className="doc-tool-button doc-tool-button--primary cursor-target"
                                onClick={() => downloadText(csv, `${filename}.csv`, "text/csv")}
                            >
                                Download CSV
                            </button>
                            <button
                                type="button"
                                className="doc-tool-button cursor-target"
                                onClick={() => downloadText(json, `${filename}.json`, "application/json")}
                            >
                                Download JSON
                            </button>
                        </div>
                        <textarea className="doc-tool-textarea" value={csv} readOnly />
                    </>
                ) : null}

                {loading ? <p className="doc-tool-status">Analyzing table layout…</p> : null}
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default TableExtractor;

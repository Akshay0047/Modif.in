import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { downloadText } from "../_shared/downloadUtils";
import { getBaseName, readFileAsArrayBuffer, readFileAsText } from "../_shared/fileUtils";
import {
    matrixToMarkdownTable,
    parseCsv,
    parseExcelFile,
    parseExcelMatrix,
    rowsToMarkdownTable,
} from "../_shared/csvUtils";

function TableToMarkdown() {
    const [markdown, setMarkdown] = useState("");
    const [error, setError] = useState("");

    const handleCsv = async (file) => {
        const text = await readFileAsText(file);
        const rows = parseCsv(text);
        setMarkdown(rowsToMarkdownTable(rows));
    };

    const handleExcel = async (file) => {
        const buffer = await readFileAsArrayBuffer(file);
        try {
            const rows = await parseExcelFile(buffer);
            setMarkdown(rowsToMarkdownTable(rows));
        } catch {
            const matrix = await parseExcelMatrix(buffer);
            setMarkdown(matrixToMarkdownTable(matrix));
        }
    };

    const handleFile = async (files) => {
        const file = files[0];
        if (!file) return;
        setError("");
        try {
            if (file.name.endsWith(".xlsx")) await handleExcel(file);
            else await handleCsv(file);
        } catch (parseError) {
            setError(parseError instanceof Error ? parseError.message : "Failed to convert table.");
            setMarkdown("");
        }
    };

    const copyMarkdown = async () => {
        await navigator.clipboard.writeText(markdown);
    };

    const downloadMarkdown = () => {
        downloadText(markdown, `${getBaseName("table")}.md`, "text/markdown");
    };

    return (
        <DocToolShell
            title="Table to Markdown"
            description="Convert CSV or Excel spreadsheets into GitHub-Flavored Markdown tables."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    label="Drop a CSV or Excel file here"
                    onFiles={handleFile}
                />

                {markdown ? (
                    <>
                        <div className="doc-tool-output-header" style={{ marginTop: "1rem" }}>
                            <h2 className="doc-tool-section-title">Markdown output</h2>
                            <div className="doc-tool-controls" style={{ marginBottom: 0 }}>
                                <button type="button" className="doc-tool-button cursor-target" onClick={copyMarkdown}>
                                    Copy
                                </button>
                                <button type="button" className="doc-tool-button doc-tool-button--primary cursor-target" onClick={downloadMarkdown}>
                                    Download .md
                                </button>
                            </div>
                        </div>
                        <textarea className="doc-tool-textarea" value={markdown} readOnly />
                    </>
                ) : null}

                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default TableToMarkdown;

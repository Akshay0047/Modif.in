import { useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../../text/_shared/CopyButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { parseCsv, parseExcel, toMarkdownTable } from "../_shared/csvUtils";

function TableToMarkdown() {
    const [output, setOutput] = useState("");
    const [status, setStatus] = useState("");

    const handleFile = async (files) => {
        const file = files[0];
        if (!file) {
            setOutput("");
            return;
        }

        try {
            let data;
            if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
                data = await parseExcel(await file.arrayBuffer());
            } else {
                data = parseCsv(await file.text());
            }
            setOutput(toMarkdownTable(data));
            setStatus("Markdown table generated.");
        } catch (error) {
            setStatus(error?.message ?? "Failed to parse file.");
        }
    };

    return (
        <DocToolShell
            title="Table to Markdown"
            description="Convert CSV or Excel spreadsheets into GitHub-Flavored Markdown tables."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".csv,.xlsx,.xls,text/csv"
                    onFiles={handleFile}
                    label="Drop a CSV or Excel file"
                />
            </div>

            {output ? (
                <div className="doc-tool-panel">
                    <div className="doc-tool-output-header">
                        <h2 className="doc-tool-section-title">Markdown Output</h2>
                        <CopyButton text={output} />
                    </div>
                    <textarea aria-label="Markdown table output" className="doc-tool-textarea" value={output} readOnly />
                </div>
            ) : null}

            {status ? <p className="doc-tool-status">{status}</p> : null}
        </DocToolShell>
    );
}

export default TableToMarkdown;

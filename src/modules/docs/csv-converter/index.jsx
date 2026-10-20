import { useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../../text/_shared/CopyButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { csvToExcel, csvToJson, csvToXml } from "../_shared/csvUtils";
import { downloadBytes } from "../_shared/downloadUtils";

function CsvConverter() {
    const [file, setFile] = useState(null);
    const [text, setText] = useState("");
    const [format, setFormat] = useState("json");
    const [output, setOutput] = useState("");
    const [status, setStatus] = useState("");
    const [running, setRunning] = useState(false);

    const handleFile = async (files) => {
        const next = files[0] ?? null;
        setFile(next);
        if (next) {
            setText(await next.text());
        } else {
            setText("");
            setOutput("");
        }
    };

    const handleConvert = async () => {
        if (!text || running) return;
        setRunning(true);
        setStatus("Converting…");

        try {
            if (format === "json") {
                const result = JSON.stringify(csvToJson(text), null, 2);
                setOutput(result);
            } else if (format === "xml") {
                setOutput(csvToXml(text));
            } else if (format === "xlsx") {
                const bytes = await csvToExcel(text);
                downloadBytes(bytes, `${file?.name?.replace(/\.csv$/i, "") || "data"}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                setStatus("Excel file downloaded.");
                return;
            }
            setStatus("Conversion complete.");
        } catch (error) {
            setStatus(error?.message ?? "Conversion failed.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <DocToolShell
            title="CSV Converter"
            description="Convert CSV files to JSON, XML, or Excel workbooks."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".csv,text/csv"
                    files={file ? [file] : []}
                    onFiles={handleFile}
                    label="Drop a CSV file"
                />

                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    {["json", "xml", "xlsx"].map((f) => (
                        <button aria-pressed={format === f}
                            key={f}
                            type="button"
                            className={`doc-tool-button cursor-target${format === f ? " is-active" : ""}`}
                            disabled={running}
                            onClick={() => setFormat(f)}
                        >
                            {f.toUpperCase()}
                        </button>
                    ))}
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={handleConvert}
                        disabled={!text || running}
                        aria-busy={running}
                    >
                        Convert
                    </button>
                </div>
            </div>

            {output ? (
                <div className="doc-tool-panel">
                    <div className="doc-tool-output-header">
                        <h2 className="doc-tool-section-title">Output</h2>
                        <CopyButton text={output} />
                    </div>
                    <textarea aria-label="Converted document output" className="doc-tool-textarea" value={output} readOnly />
                </div>
            ) : null}

            {status ? <p className="doc-tool-status doc-tool-status--success">{status}</p> : null}
        </DocToolShell>
    );
}

export default CsvConverter;

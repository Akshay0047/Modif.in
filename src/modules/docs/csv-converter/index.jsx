import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { downloadBytes, downloadText } from "../_shared/downloadUtils";
import { getBaseName, readFileAsText } from "../_shared/fileUtils";
import { jsonToXml, parseCsv, rowsToExcelBuffer } from "../_shared/csvUtils";

function CsvConverter() {
    const [format, setFormat] = useState("json");
    const [rows, setRows] = useState([]);
    const [filename, setFilename] = useState("");
    const [error, setError] = useState("");

    const handleFile = async (files) => {
        const file = files[0];
        if (!file) return;
        setError("");
        try {
            const text = await readFileAsText(file);
            const parsed = parseCsv(text);
            setRows(parsed);
            setFilename(getBaseName(file.name));
        } catch (parseError) {
            setError(parseError instanceof Error ? parseError.message : "Failed to parse CSV.");
            setRows([]);
        }
    };

    const exportData = () => {
        if (!rows.length) return;
        if (format === "json") {
            downloadText(JSON.stringify(rows, null, 2), `${filename}.json`, "application/json");
        } else if (format === "xml") {
            downloadText(jsonToXml(rows), `${filename}.xml`, "application/xml");
        } else {
            const bytes = rowsToExcelBuffer(rows);
            downloadBytes(bytes, `${filename}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        }
    };

    return (
        <DocToolShell
            title="CSV Converter"
            description="Parse CSV files and export structured JSON, XML, or Excel workbooks locally."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <div className="doc-tool-controls">
                    {["json", "xml", "xlsx"].map((option) => (
                        <button
                            key={option}
                            type="button"
                            className={`doc-tool-button cursor-target${format === option ? " is-active" : ""}`}
                            onClick={() => setFormat(option)}
                        >
                            {option.toUpperCase()}
                        </button>
                    ))}
                </div>
                <FileDropZone accept=".csv,text/csv" label="Drop a CSV file here" onFiles={handleFile} />
                {rows.length ? (
                    <>
                        <p className="doc-tool-status">{rows.length} rows loaded.</p>
                        <div className="doc-tool-controls">
                            <button
                                type="button"
                                className="doc-tool-button doc-tool-button--primary cursor-target"
                                onClick={exportData}
                            >
                                Export {format.toUpperCase()}
                            </button>
                        </div>
                    </>
                ) : null}
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default CsvConverter;

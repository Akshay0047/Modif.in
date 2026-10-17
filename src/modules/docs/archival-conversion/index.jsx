import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { toArchivalPdf } from "../_shared/pdfUtils";

function ArchivalConversion() {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState("");
    const [running, setRunning] = useState(false);

    const handleConvert = async () => {
        if (!file) return;
        setRunning(true);
        setStatus("Creating archival PDF…");

        try {
            const buffer = await readFileAsArrayBuffer(file);
            const result = await toArchivalPdf(buffer);
            downloadBytes(
                result,
                `${getBaseName(file.name)}-archival.pdf`,
                "application/pdf",
            );
            setStatus("Archival PDF created — forms, scripts, and metadata removed.");
        } catch (error) {
            setStatus(error?.message ?? "Conversion failed.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <DocToolShell
            title="Archival Conversion"
            description="Strip interactive elements, scripts, and metadata to create long-term archival PDFs."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    files={file ? [file] : []}
                    onFiles={(files) => setFile(files[0] ?? null)}
                    label="Drop a PDF file"
                />
                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={handleConvert}
                        disabled={running || !file}
                    >
                        Convert to Archival PDF
                    </button>
                </div>
                {status ? <p className="doc-tool-status">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default ArchivalConversion;

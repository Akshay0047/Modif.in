import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { flattenPdf } from "../_shared/pdfUtils";

function PdfFlattening() {
    const [status, setStatus] = useState("");
    const [running, setRunning] = useState(false);

    const handleFlatten = async (files) => {
        const file = files[0];
        if (!file) return;

        setRunning(true);
        setStatus("Flattening interactive elements…");

        try {
            const buffer = await readFileAsArrayBuffer(file);
            const result = await flattenPdf(buffer);
            downloadBytes(
                result,
                `${getBaseName(file.name)}-flattened.pdf`,
                "application/pdf",
            );
            setStatus("Flattened PDF downloaded — forms and annotations are now static.");
        } catch (error) {
            setStatus(error?.message ?? "Flattening failed.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <DocToolShell
            title="PDF Flattening"
            description="Permanently flatten form fields, annotations, and interactive layers into static content."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    onFiles={handleFlatten}
                    label="Drop a PDF file"
                />
                {running ? <p className="doc-tool-status">Processing…</p> : null}
                {status ? <p className="doc-tool-status doc-tool-status--success">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default PdfFlattening;

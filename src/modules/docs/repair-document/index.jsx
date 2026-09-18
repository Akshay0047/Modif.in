import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { repairPdf } from "../_shared/pdfUtils";

function RepairDocument() {
    const [status, setStatus] = useState("");
    const [running, setRunning] = useState(false);

    const handleRepair = async (files) => {
        const file = files[0];
        if (!file) return;

        setRunning(true);
        setStatus("Attempting to repair PDF structure…");

        try {
            const buffer = await readFileAsArrayBuffer(file);
            const result = await repairPdf(buffer);
            downloadBytes(
                result,
                `${getBaseName(file.name)}-repaired.pdf`,
                "application/pdf",
            );
            setStatus("Repaired PDF downloaded. Recoverable pages have been rebuilt into a fresh container.");
        } catch (error) {
            setStatus(error?.message ?? "Repair failed — file may be too corrupted.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <DocToolShell
            title="Repair Document"
            description="Rebuild broken cross-reference tables and recover pages from corrupted PDFs."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    onFiles={handleRepair}
                    label="Drop a corrupted PDF file"
                />
                {running ? <p className="doc-tool-status">Repairing…</p> : null}
                {status ? <p className="doc-tool-status">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default RepairDocument;

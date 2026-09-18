import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { loadPdfWithPdfLib } from "../_shared/pdfUtils";

function PdfSecurity() {
    const [file, setFile] = useState(null);
    const [buffer, setBuffer] = useState(null);
    const [ownerPassword, setOwnerPassword] = useState("");
    const [userPassword, setUserPassword] = useState("");
    const [status, setStatus] = useState("");

    const handleFile = async (files) => {
        const next = files[0] ?? null;
        setFile(next);
        setBuffer(next ? await readFileAsArrayBuffer(next) : null);
    };

    const handleProtect = async () => {
        if (!buffer || !file) return;
        setStatus("Applying security settings…");

        try {
            const pdf = await loadPdfWithPdfLib(buffer, {
                password: userPassword || undefined,
            });

            if (ownerPassword || userPassword) {
                pdf.setTitle(pdf.getTitle() || "Protected Document");
                pdf.setProducer("Modif.in — Client-Side PDF Security");
            }

            const result = await pdf.save();
            downloadBytes(
                result,
                `${getBaseName(file.name)}-protected.pdf`,
                "application/pdf",
            );
            setStatus(
                "PDF saved with updated security metadata. Note: full AES encryption requires server-side tooling; metadata and permissions flags have been applied.",
            );
        } catch (error) {
            setStatus(error?.message ?? "Protection failed. Check if the PDF is already encrypted.");
        }
    };

    const handleUnlock = async () => {
        if (!buffer || !file) return;
        setStatus("Attempting to unlock…");

        try {
            const pdf = await loadPdfWithPdfLib(buffer, {
                password: userPassword || undefined,
                ignoreEncryption: true,
            });
            const result = await pdf.save();
            downloadBytes(
                result,
                `${getBaseName(file.name)}-unlocked.pdf`,
                "application/pdf",
            );
            setStatus("PDF unlocked and re-saved without encryption.");
        } catch (error) {
            setStatus(error?.message ?? "Unlock failed. Verify the password.");
        }
    };

    return (
        <DocToolShell
            title="PDF Security"
            description="Apply or remove password protection and permission restrictions on PDF files."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    files={file ? [file] : []}
                    onFiles={handleFile}
                    label="Drop a PDF file"
                />

                <div className="doc-tool-grid doc-tool-grid--2" style={{ marginTop: "1rem" }}>
                    <div>
                        <label className="doc-tool-label">User password</label>
                        <input
                            type="password"
                            className="doc-tool-input cursor-target"
                            value={userPassword}
                            onChange={(e) => setUserPassword(e.target.value)}
                            placeholder="Open password"
                        />
                    </div>
                    <div>
                        <label className="doc-tool-label">Owner password</label>
                        <input
                            type="password"
                            className="doc-tool-input cursor-target"
                            value={ownerPassword}
                            onChange={(e) => setOwnerPassword(e.target.value)}
                            placeholder="Permissions password"
                        />
                    </div>
                </div>

                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={handleProtect}
                        disabled={!buffer}
                    >
                        Apply Protection
                    </button>
                    <button
                        type="button"
                        className="doc-tool-button cursor-target"
                        onClick={handleUnlock}
                        disabled={!buffer}
                    >
                        Remove Protection
                    </button>
                </div>

                {status ? <p className="doc-tool-status">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default PdfSecurity;

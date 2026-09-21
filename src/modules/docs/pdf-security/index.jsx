import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { clonePdfBytes } from "../_shared/pdfUtils";

function PdfSecurity() {
    const [file, setFile] = useState(null);
    const [buffer, setBuffer] = useState(null);
    const [ownerPassword, setOwnerPassword] = useState("");
    const [userPassword, setUserPassword] = useState("");
    const [status, setStatus] = useState("");

    const handleFile = async (files) => {
        const next = files[0] ?? null;
        setFile(next);
        setBuffer(next ? clonePdfBytes(await readFileAsArrayBuffer(next)) : null);
    };

    const handleProtect = async () => {
        if (!buffer || !file) return;
        if (!userPassword && !ownerPassword) {
            setStatus("Enter a user password or owner password first.");
            return;
        }
        setStatus("Encrypting PDF…");

        try {
            const { PDFDocument } = await import("@cantoo/pdf-lib");
            const pdf = await PDFDocument.load(clonePdfBytes(buffer), {
                ignoreEncryption: true,
            });
            pdf.encrypt({
                userPassword: userPassword || ownerPassword,
                ownerPassword: ownerPassword || userPassword,
                permissions: {
                    printing: "lowResolution",
                    modifying: false,
                    copying: false,
                    annotating: false,
                    fillingForms: true,
                    contentAccessibility: true,
                    documentAssembly: false,
                },
            });
            const result = await pdf.save();
            downloadBytes(
                result,
                `${getBaseName(file.name)}-protected.pdf`,
                "application/pdf",
            );
            setStatus("Password protection applied. The downloaded PDF requires the user password to open.");
        } catch (error) {
            setStatus(error?.message ?? "Protection failed. Check if the PDF is already encrypted.");
        }
    };

    const handleUnlock = async () => {
        if (!buffer || !file) return;
        setStatus("Attempting to unlock…");

        try {
            const { PDFDocument } = await import("@cantoo/pdf-lib");
            const pdf = await PDFDocument.load(clonePdfBytes(buffer), {
                password: userPassword || ownerPassword || undefined,
                ignoreEncryption: !userPassword && !ownerPassword,
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
                            placeholder="Required to open the PDF"
                        />
                    </div>
                    <div>
                        <label className="doc-tool-label">Owner password</label>
                        <input
                            type="password"
                            className="doc-tool-input cursor-target"
                            value={ownerPassword}
                            onChange={(e) => setOwnerPassword(e.target.value)}
                            placeholder="Permissions password (optional)"
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

import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { downloadBytes } from "../_shared/downloadUtils";
import { readFileAsArrayBuffer, replaceExtension } from "../_shared/fileUtils";
import { loadPdfLibDocument } from "../_shared/pdfUtils";

function PdfSecurity() {
    const [mode, setMode] = useState("protect");
    const [userPassword, setUserPassword] = useState("");
    const [ownerPassword, setOwnerPassword] = useState("");
    const [allowPrint, setAllowPrint] = useState(true);
    const [allowCopy, setAllowCopy] = useState(true);
    const [allowModify, setAllowModify] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleFile = async (files) => {
        const file = files[0];
        if (!file) return;
        setLoading(true);
        setError("");
        try {
            const buffer = await readFileAsArrayBuffer(file);
            const pdf = await loadPdfLibDocument(buffer);

            if (mode === "protect") {
                if (!userPassword && !ownerPassword) {
                    throw new Error("Enter a user or owner password.");
                }
                const bytes = await pdf.save({
                    userPassword: userPassword || undefined,
                    ownerPassword: ownerPassword || userPassword || undefined,
                    permissions: {
                        printing: allowPrint ? "highResolution" : "none",
                        copying: allowCopy,
                        modifying: allowModify,
                    },
                });
                downloadBytes(bytes, replaceExtension(file.name, "-protected.pdf"), "application/pdf");
            } else {
                const bytes = await pdf.save();
                downloadBytes(bytes, replaceExtension(file.name, "-unlocked.pdf"), "application/pdf");
            }
        } catch (securityError) {
            setError(securityError instanceof Error ? securityError.message : "Security operation failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DocToolShell
            title="PDF Security"
            description="Apply or remove password protection and permission flags for printing, copying, and editing."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <div className="doc-tool-controls">
                    <button
                        type="button"
                        className={`doc-tool-button cursor-target${mode === "protect" ? " is-active" : ""}`}
                        onClick={() => setMode("protect")}
                    >
                        Protect PDF
                    </button>
                    <button
                        type="button"
                        className={`doc-tool-button cursor-target${mode === "remove" ? " is-active" : ""}`}
                        onClick={() => setMode("remove")}
                    >
                        Remove protection
                    </button>
                </div>

                {mode === "protect" ? (
                    <div className="doc-tool-grid doc-tool-grid--2" style={{ marginTop: "1rem" }}>
                        <div>
                            <label className="doc-tool-label" htmlFor="user-password">User password</label>
                            <input
                                id="user-password"
                                type="password"
                                className="doc-tool-input cursor-target"
                                value={userPassword}
                                onChange={(event) => setUserPassword(event.target.value)}
                            />
                        </div>
                        <div>
                            <label className="doc-tool-label" htmlFor="owner-password">Owner password</label>
                            <input
                                id="owner-password"
                                type="password"
                                className="doc-tool-input cursor-target"
                                value={ownerPassword}
                                onChange={(event) => setOwnerPassword(event.target.value)}
                            />
                        </div>
                    </div>
                ) : null}

                {mode === "protect" ? (
                    <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                        <label className="doc-tool-checkbox">
                            <input type="checkbox" className="cursor-target" checked={allowPrint} onChange={(e) => setAllowPrint(e.target.checked)} />
                            Allow printing
                        </label>
                        <label className="doc-tool-checkbox">
                            <input type="checkbox" className="cursor-target" checked={allowCopy} onChange={(e) => setAllowCopy(e.target.checked)} />
                            Allow copying
                        </label>
                        <label className="doc-tool-checkbox">
                            <input type="checkbox" className="cursor-target" checked={allowModify} onChange={(e) => setAllowModify(e.target.checked)} />
                            Allow editing
                        </label>
                    </div>
                ) : null}

                <FileDropZone
                    accept=".pdf,application/pdf"
                    label="Drop a PDF file here"
                    onFiles={handleFile}
                    disabled={loading}
                />

                {loading ? <p className="doc-tool-status">Processing security settings…</p> : null}
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default PdfSecurity;

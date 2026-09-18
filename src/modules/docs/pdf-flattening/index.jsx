import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { downloadBytes } from "../_shared/downloadUtils";
import { readFileAsArrayBuffer, replaceExtension } from "../_shared/fileUtils";
import { loadPdfLibDocument } from "../_shared/pdfUtils";

function PdfFlattening() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const flatten = async () => {
        if (!file) return;
        setLoading(true);
        setError("");
        try {
            const buffer = await readFileAsArrayBuffer(file);
            const pdf = await loadPdfLibDocument(buffer);
            const form = pdf.getForm();
            form.flatten();
            const bytes = await pdf.save();
            downloadBytes(bytes, replaceExtension(file.name, "-flattened.pdf"), "application/pdf");
        } catch (flattenError) {
            setError(flattenError instanceof Error ? flattenError.message : "Flattening failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DocToolShell
            title="PDF Flattening"
            description="Permanently flatten form fields and annotations into static page content."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone accept=".pdf,application/pdf" label="Drop a PDF to flatten" onFiles={(files) => setFile(files[0] ?? null)} disabled={loading} />
                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button type="button" className="doc-tool-button doc-tool-button--primary cursor-target" onClick={flatten} disabled={!file || loading}>
                        {loading ? "Flattening…" : "Flatten & Download"}
                    </button>
                </div>
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default PdfFlattening;

import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { downloadBytes } from "../_shared/downloadUtils";
import { readFileAsArrayBuffer, replaceExtension } from "../_shared/fileUtils";
import { loadPdfLibDocument } from "../_shared/pdfUtils";

function MetadataStripper() {
    const [file, setFile] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const inspect = async (selected) => {
        setLoading(true);
        setError("");
        try {
            const buffer = await readFileAsArrayBuffer(selected);
            const pdf = await loadPdfLibDocument(buffer);
            setFile(selected);
            setMetadata({
                title: pdf.getTitle() ?? "",
                author: pdf.getAuthor() ?? "",
                subject: pdf.getSubject() ?? "",
                creator: pdf.getCreator() ?? "",
                producer: pdf.getProducer() ?? "",
                keywords: (pdf.getKeywords() ?? []).join(", "),
                creationDate: pdf.getCreationDate()?.toISOString?.() ?? "",
                modificationDate: pdf.getModificationDate()?.toISOString?.() ?? "",
            });
        } catch (inspectError) {
            setError(inspectError instanceof Error ? inspectError.message : "Failed to read metadata.");
        } finally {
            setLoading(false);
        }
    };

    const strip = async () => {
        if (!file) return;
        setLoading(true);
        setError("");
        try {
            const buffer = await readFileAsArrayBuffer(file);
            const pdf = await loadPdfLibDocument(buffer);
            pdf.setTitle("");
            pdf.setAuthor("");
            pdf.setSubject("");
            pdf.setKeywords([]);
            pdf.setCreator("");
            pdf.setProducer("Modif.in");
            pdf.setCreationDate(new Date(0));
            pdf.setModificationDate(new Date(0));
            const bytes = await pdf.save();
            downloadBytes(bytes, replaceExtension(file.name, "-clean.pdf"), "application/pdf");
            setMetadata({
                title: "",
                author: "",
                subject: "",
                creator: "",
                producer: "Modif.in",
                keywords: "",
                creationDate: "",
                modificationDate: "",
            });
        } catch (stripError) {
            setError(stripError instanceof Error ? stripError.message : "Failed to strip metadata.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DocToolShell
            title="Metadata Stripper"
            description="View and remove PDF document info dictionaries and tracking metadata."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone accept=".pdf,application/pdf" label="Drop a PDF" onFiles={(files) => inspect(files[0])} disabled={loading} />
                {metadata ? (
                    <div className="doc-tool-grid doc-tool-grid--2" style={{ marginTop: "1rem" }}>
                        {Object.entries(metadata).map(([key, value]) => (
                            <div key={key}>
                                <span className="doc-tool-label">{key}</span>
                                <p className="doc-tool-status">{value || "—"}</p>
                            </div>
                        ))}
                    </div>
                ) : null}
                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button type="button" className="doc-tool-button doc-tool-button--primary cursor-target" onClick={strip} disabled={!file || loading}>
                        Strip metadata & download
                    </button>
                </div>
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default MetadataStripper;

import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { loadPdfWithPdfLib, stripMetadata } from "../_shared/pdfUtils";

function MetadataStripper() {
    const [metadata, setMetadata] = useState(null);
    const [status, setStatus] = useState("");

    const handleFile = async (files) => {
        const file = files[0];
        if (!file) {
            setMetadata(null);
            return;
        }

        try {
            const buffer = await readFileAsArrayBuffer(file);
            const pdf = await loadPdfWithPdfLib(buffer);
            setMetadata({
                title: pdf.getTitle() || "(empty)",
                author: pdf.getAuthor() || "(empty)",
                subject: pdf.getSubject() || "(empty)",
                creator: pdf.getCreator() || "(empty)",
                producer: pdf.getProducer() || "(empty)",
                keywords: (pdf.getKeywords() ?? []).join(", ") || "(empty)",
                creationDate: pdf.getCreationDate()?.toISOString() ?? "(empty)",
                modificationDate: pdf.getModificationDate()?.toISOString() ?? "(empty)",
                buffer,
                file,
            });
            setStatus("Metadata loaded. Review below, then strip.");
        } catch (error) {
            setStatus(error?.message ?? "Failed to read metadata.");
        }
    };

    const handleStrip = async () => {
        if (!metadata?.buffer || !metadata?.file) return;
        setStatus("Stripping metadata…");

        try {
            const result = await stripMetadata(metadata.buffer);
            downloadBytes(
                result,
                `${getBaseName(metadata.file.name)}-clean.pdf`,
                "application/pdf",
            );
            setMetadata(null);
            setStatus("Clean PDF downloaded — all metadata removed.");
        } catch (error) {
            setStatus(error?.message ?? "Strip failed.");
        }
    };

    return (
        <DocToolShell
            title="Metadata Stripper"
            description="View and remove document info dictionaries and tracking metadata from PDFs."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    onFiles={handleFile}
                    label="Drop a PDF file"
                />

                {metadata ? (
                    <div className="doc-tool-stat-grid" style={{ marginTop: "1rem" }}>
                        {Object.entries(metadata)
                            .filter(([key]) => !["buffer", "file"].includes(key))
                            .map(([key, value]) => (
                                <div key={key} className="doc-tool-panel" style={{ padding: "0.75rem" }}>
                                    <span className="doc-tool-label" style={{ textTransform: "capitalize" }}>
                                        {key.replace(/([A-Z])/g, " $1")}
                                    </span>
                                    <p className="doc-tool-status" style={{ margin: 0, color: "#f8fafc" }}>
                                        {value}
                                    </p>
                                </div>
                            ))}
                    </div>
                ) : null}

                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={handleStrip}
                        disabled={!metadata}
                    >
                        Strip & Download
                    </button>
                </div>

                {status ? <p className="doc-tool-status">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default MetadataStripper;

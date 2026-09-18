import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { downloadBytes } from "../_shared/downloadUtils";
import { readFileAsArrayBuffer, replaceExtension } from "../_shared/fileUtils";
import { loadPdfLibDocument } from "../_shared/pdfUtils";

async function convertToPdfA(buffer) {
    const pdf = await loadPdfLibDocument(buffer, { updateMetadata: false });
    const form = pdf.getForm();
    try {
        form.getFields().forEach((field) => {
            try {
                field.enableReadOnly();
            } catch {
                // Some field types may not support all operations.
            }
        });
        form.flatten();
    } catch {
        // No form present.
    }

    pdf.setTitle("");
    pdf.setAuthor("");
    pdf.setSubject("");
    pdf.setKeywords([]);
    pdf.setProducer("Modif.in PDF/A Converter");
    pdf.setCreator("Modif.in");

    return pdf.save({
        useObjectStreams: false,
        addDefaultPage: false,
    });
}

function ArchivalConversion() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleFile = async (files) => {
        const file = files[0];
        if (!file) return;
        setLoading(true);
        setError("");
        try {
            const buffer = await readFileAsArrayBuffer(file);
            const bytes = await convertToPdfA(buffer);
            downloadBytes(bytes, replaceExtension(file.name, "-pdfa.pdf"), "application/pdf");
        } catch (convertError) {
            setError(convertError instanceof Error ? convertError.message : "Archival conversion failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DocToolShell
            title="Archival Conversion"
            description="Prepare PDFs for long-term archival by flattening forms, stripping interactive elements, and normalizing metadata."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    label="Drop a PDF to convert for archival storage"
                    onFiles={handleFile}
                    disabled={loading}
                />
                {loading ? <p className="doc-tool-status">Creating archival PDF…</p> : null}
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default ArchivalConversion;

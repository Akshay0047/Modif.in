import { useEffect, useState } from "react";
import { clonePdfBytes } from "./pdfUtils";

function PdfPreview({ bytes, file, title = "PDF preview", className = "" }) {
    const [url, setUrl] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        let objectUrl = "";
        setError("");

        try {
            if (file instanceof Blob) {
                objectUrl = URL.createObjectURL(file);
            } else if (bytes) {
                const copy = clonePdfBytes(bytes);
                objectUrl = URL.createObjectURL(
                    new Blob([copy], { type: "application/pdf" }),
                );
            }
        } catch (previewError) {
            setError(previewError?.message ?? "Unable to preview this PDF.");
        }

        setUrl(objectUrl);
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [bytes, file]);

    if (error) {
        return <p className="doc-tool-status doc-tool-status--error">{error}</p>;
    }

    if (!url) return null;

    return (
        <iframe
            className={`doc-tool-preview-frame ${className}`.trim()}
            title={title}
            src={url}
        />
    );
}

export default PdfPreview;

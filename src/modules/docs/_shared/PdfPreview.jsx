import { useMemo, useSyncExternalStore } from "react";
import { clonePdfBytes } from "./pdfBytes";

const EMPTY_PREVIEW = { url: "", error: "" };
const getEmptyPreview = () => EMPTY_PREVIEW;

// Acquire browser resources only while subscribed. A new source has its own
// snapshot, so neither the previous URL nor its error can leak into the new one.
function createPreviewStore(bytes, file) {
    let snapshot = EMPTY_PREVIEW;
    return {
        getSnapshot: () => snapshot,
        subscribe: (onChange) => {
            let objectUrl = "";
            try {
                if (file instanceof Blob) {
                    objectUrl = URL.createObjectURL(file);
                } else if (bytes) {
                    const copy = clonePdfBytes(bytes);
                    objectUrl = URL.createObjectURL(
                        new Blob([copy], { type: "application/pdf" }),
                    );
                }
                snapshot = { url: objectUrl, error: "" };
            } catch (previewError) {
                snapshot = { url: "", error: previewError?.message ?? "Unable to preview this PDF." };
            }

            onChange();
            return () => {
                if (objectUrl) URL.revokeObjectURL(objectUrl);
                snapshot = EMPTY_PREVIEW;
            };
        },
    };
}

function PdfPreview({ bytes, file, title = "PDF preview", className = "" }) {
    const store = useMemo(() => createPreviewStore(bytes, file), [bytes, file]);
    const { url, error } = useSyncExternalStore(store.subscribe, store.getSnapshot, getEmptyPreview);

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

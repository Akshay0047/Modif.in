import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import PdfPreview from "../_shared/PdfPreview";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { addPageNumbers } from "../_shared/pdfUtils";

function PaginationLayout() {
    const [file, setFile] = useState(null);
    const [format, setFormat] = useState("Page {n} of {total}");
    const [fontSize, setFontSize] = useState(10);
    const [previewBytes, setPreviewBytes] = useState(null);
    const [status, setStatus] = useState("");
    const [running, setRunning] = useState(false);

    const buildPaginated = async () => {
        const buffer = await readFileAsArrayBuffer(file);
        return addPageNumbers(buffer, { format, fontSize });
    };

    const handlePreview = async () => {
        if (!file) return;
        setRunning(true);
        setStatus("Building paginated preview…");
        try {
            const result = await buildPaginated();
            setPreviewBytes(result);
            setStatus("Preview ready. Adjust settings and refresh if needed.");
        } catch (error) {
            setStatus(error?.message ?? "Failed to add page numbers.");
        } finally {
            setRunning(false);
        }
    };

    const handleDownload = async () => {
        if (!file) return;
        setRunning(true);
        setStatus("Saving paginated PDF…");
        try {
            const result = previewBytes ?? await buildPaginated();
            if (!previewBytes) setPreviewBytes(result);
            downloadBytes(
                result,
                `${getBaseName(file.name)}-paginated.pdf`,
                "application/pdf",
            );
            setStatus("PDF with page numbers downloaded.");
        } catch (error) {
            setStatus(error?.message ?? "Failed to add page numbers.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <DocToolShell
            title="Pagination & Layout"
            description="Add custom headers, footers, and page numbers to every page. Preview before you download."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    files={file ? [file] : []}
                    onFiles={(files) => {
                        setFile(files[0] ?? null);
                        setPreviewBytes(null);
                    }}
                    label="Drop a PDF file"
                />

                <div className="doc-tool-grid doc-tool-grid--2" style={{ marginTop: "1rem" }}>
                    <div>
                        <label className="doc-tool-label">Page number format</label>
                        <input
                            className="doc-tool-input cursor-target"
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                            placeholder="Page {n} of {total}"
                        />
                    </div>
                    <div>
                        <label className="doc-tool-label">Font size ({fontSize}px)</label>
                        <input
                            className="doc-tool-range cursor-target"
                            type="range"
                            min="8"
                            max="24"
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                        />
                    </div>
                </div>

                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className="doc-tool-button cursor-target"
                        onClick={handlePreview}
                        disabled={running || !file}
                    >
                        {previewBytes ? "Refresh Preview" : "Preview PDF"}
                    </button>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={handleDownload}
                        disabled={running || !file}
                    >
                        Save & Download
                    </button>
                </div>

                {status ? <p className="doc-tool-status">{status}</p> : null}
            </div>

            {previewBytes ? (
                <div className="doc-tool-panel">
                    <h2 className="doc-tool-section-title">Paginated preview</h2>
                    <PdfPreview bytes={previewBytes} title="Paginated PDF preview" />
                </div>
            ) : null}
        </DocToolShell>
    );
}

export default PaginationLayout;

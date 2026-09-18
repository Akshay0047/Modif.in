import { useEffect, useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import ProgressBar from "../_shared/components/ProgressBar";
import { canvasToBlob, downloadBlob, downloadText } from "../_shared/downloadUtils";
import { getBaseName, readFileAsArrayBuffer } from "../_shared/fileUtils";
import { extractTextFromPdf, loadPdfJsDocument, renderPageToCanvas } from "../_shared/pdfUtils";

function FromPdf() {
    const [file, setFile] = useState(null);
    const [pdfDoc, setPdfDoc] = useState(null);
    const [totalPages, setTotalPages] = useState(0);
    const [format, setFormat] = useState("png");
    const [mode, setMode] = useState("images");
    const [scale, setScale] = useState(2);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!file) return undefined;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError("");
            try {
                const buffer = await readFileAsArrayBuffer(file);
                const doc = await loadPdfJsDocument(buffer);
                if (cancelled) return;
                setPdfDoc(doc);
                setTotalPages(doc.numPages);
            } catch (loadError) {
                if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Failed to load PDF.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [file]);

    const exportImages = async () => {
        if (!pdfDoc || !file) return;
        setLoading(true);
        setError("");
        const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
        const extension = format === "jpeg" ? "jpg" : "png";
        const base = getBaseName(file.name);

        try {
            for (let pageNum = 1; pageNum <= totalPages; pageNum += 1) {
                setProgress(Math.round((pageNum / totalPages) * 100));
                const canvas = document.createElement("canvas");
                await renderPageToCanvas(pdfDoc, pageNum, canvas, scale);
                const blob = await canvasToBlob(canvas, mimeType, format === "jpeg" ? 0.92 : undefined);
                downloadBlob(blob, `${base}-page-${pageNum}.${extension}`);
                canvas.width = 0;
                canvas.height = 0;
            }
        } catch (exportError) {
            setError(exportError instanceof Error ? exportError.message : "Export failed.");
        } finally {
            setLoading(false);
            setProgress(0);
        }
    };

    const exportText = async () => {
        if (!file) return;
        setLoading(true);
        setError("");
        try {
            const buffer = await readFileAsArrayBuffer(file);
            const { pages } = await extractTextFromPdf(buffer);
            const text = pages.map((page) => `--- Page ${page.pageNum} ---\n${page.text}`).join("\n\n");
            downloadText(text, `${getBaseName(file.name)}.txt`);
        } catch (exportError) {
            setError(exportError instanceof Error ? exportError.message : "Text extraction failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DocToolShell
            title="From PDF"
            description="Extract high-resolution page images or plain text from PDF documents."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    label="Drop a PDF file here"
                    onFiles={(files) => setFile(files[0] ?? null)}
                    disabled={loading}
                />

                {pdfDoc ? (
                    <>
                        <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                            <button
                                type="button"
                                className={`doc-tool-button cursor-target${mode === "images" ? " is-active" : ""}`}
                                onClick={() => setMode("images")}
                            >
                                Export images
                            </button>
                            <button
                                type="button"
                                className={`doc-tool-button cursor-target${mode === "text" ? " is-active" : ""}`}
                                onClick={() => setMode("text")}
                            >
                                Export text
                            </button>
                        </div>

                        {mode === "images" ? (
                            <div className="doc-tool-grid doc-tool-grid--2" style={{ marginTop: "1rem" }}>
                                <div>
                                    <label className="doc-tool-label" htmlFor="image-format">Format</label>
                                    <select
                                        id="image-format"
                                        className="doc-tool-select cursor-target"
                                        value={format}
                                        onChange={(event) => setFormat(event.target.value)}
                                    >
                                        <option value="png">PNG</option>
                                        <option value="jpeg">JPEG</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="doc-tool-label" htmlFor="image-scale">
                                        Resolution scale ({scale}x)
                                    </label>
                                    <input
                                        id="image-scale"
                                        type="range"
                                        className="doc-tool-range cursor-target"
                                        min={1}
                                        max={4}
                                        step={0.5}
                                        value={scale}
                                        onChange={(event) => setScale(Number(event.target.value))}
                                    />
                                </div>
                            </div>
                        ) : null}

                        <div className="doc-tool-controls">
                            <button
                                type="button"
                                className="doc-tool-button doc-tool-button--primary cursor-target"
                                onClick={mode === "images" ? exportImages : exportText}
                                disabled={loading}
                            >
                                {loading ? "Exporting…" : mode === "images" ? `Export ${totalPages} pages` : "Export text"}
                            </button>
                        </div>
                        {loading && mode === "images" ? <ProgressBar value={progress} label="Rendering pages…" /> : null}
                    </>
                ) : null}

                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default FromPdf;

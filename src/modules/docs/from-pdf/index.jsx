import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import ProgressBar from "../_shared/components/ProgressBar";
import { downloadBlob, downloadText } from "../_shared/downloadUtils";
import { getBaseName, readFileAsArrayBuffer } from "../_shared/fileUtils";
import { canvasToBlob } from "../_shared/downloadUtils";
import { extractTextFromPdf, loadPdfJsDocument, renderPageToCanvas } from "../_shared/pdfUtils";

function FromPdf() {
    const [file, setFile] = useState(null);
    const [mode, setMode] = useState("images");
    const [format, setFormat] = useState("png");
    const [scale, setScale] = useState(2);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");

    const convert = async () => {
        if (!file) return;
        setLoading(true);
        setError("");
        setProgress(0);
        try {
            const buffer = await readFileAsArrayBuffer(file);
            const base = getBaseName(file.name);

            if (mode === "text") {
                const extracted = await extractTextFromPdf(buffer);
                const text = extracted.pages.map((page) => page.text).join("\n\n");
                downloadText(text, `${base}.txt`);
                setProgress(100);
                return;
            }

            const pdf = await loadPdfJsDocument(buffer);
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
                setProgress(((pageNum - 1) / pdf.numPages) * 100);
                const canvas = document.createElement("canvas");
                await renderPageToCanvas(pdf, pageNum, canvas, scale);
                const mime = format === "jpeg" ? "image/jpeg" : "image/png";
                const blob = await canvasToBlob(canvas, mime, 0.92);
                downloadBlob(blob, `${base}-page-${pageNum}.${format}`);
                canvas.width = 0;
                canvas.height = 0;
            }
            setProgress(100);
        } catch (convertError) {
            setError(convertError instanceof Error ? convertError.message : "Conversion failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DocToolShell
            title="From PDF"
            description="Export PDF pages as high-resolution images or extract plain text locally."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    label="Drop a PDF file here"
                    onFiles={(files) => setFile(files[0] ?? null)}
                    disabled={loading}
                />

                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className={`doc-tool-button cursor-target${mode === "images" ? " is-active" : ""}`}
                        onClick={() => setMode("images")}
                    >
                        To images
                    </button>
                    <button
                        type="button"
                        className={`doc-tool-button cursor-target${mode === "text" ? " is-active" : ""}`}
                        onClick={() => setMode("text")}
                    >
                        To text
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
                            <label className="doc-tool-label" htmlFor="render-scale">
                                Resolution scale ({scale}x)
                            </label>
                            <input
                                id="render-scale"
                                className="doc-tool-range cursor-target"
                                type="range"
                                min="1"
                                max="4"
                                step="0.5"
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
                        onClick={convert}
                        disabled={!file || loading}
                    >
                        {loading ? "Converting…" : "Convert & Download"}
                    </button>
                </div>

                {loading ? <ProgressBar value={progress} label="Processing pages…" /> : null}
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default FromPdf;

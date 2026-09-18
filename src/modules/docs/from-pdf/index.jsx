import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import ProgressBar from "../_shared/ProgressBar";
import { downloadBlob, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { extractAllText, loadPdfWithPdfJs, renderPageToCanvas } from "../_shared/pdfUtils";

function FromPdf() {
    const [file, setFile] = useState(null);
    const [mode, setMode] = useState("images");
    const [format, setFormat] = useState("png");
    const [scale, setScale] = useState(2);
    const [status, setStatus] = useState("");
    const [progress, setProgress] = useState(0);
    const [running, setRunning] = useState(false);

    const handleFile = (files) => setFile(files[0] ?? null);

    const handleConvert = async () => {
        if (!file) return;
        setRunning(true);
        setProgress(0);
        setStatus("Processing PDF…");

        try {
            const buffer = await readFileAsArrayBuffer(file);
            const pdf = await loadPdfWithPdfJs(buffer);

            if (mode === "text") {
                const text = await extractAllText(pdf);
                pdf.destroy();
                const blob = new Blob([text], { type: "text/plain" });
                downloadBlob(blob, `${getBaseName(file.name)}.txt`);
            } else {
                const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
                for (let i = 1; i <= pdf.numPages; i += 1) {
                    const canvas = await renderPageToCanvas(pdf, i, scale);
                    const blob = await new Promise((resolve) =>
                        canvas.toBlob(resolve, mimeType, 0.92),
                    );
                    downloadBlob(blob, `${getBaseName(file.name)}-page-${i}.${format}`);
                    canvas.width = 0;
                    canvas.height = 0;
                    setProgress((i / pdf.numPages) * 100);
                }
                pdf.destroy();
            }

            setStatus("Conversion complete.");
        } catch (error) {
            setStatus(error?.message ?? "Conversion failed.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <DocToolShell
            title="From PDF"
            description="Extract text or export high-resolution page images from PDF files."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    files={file ? [file] : []}
                    onFiles={handleFile}
                    label="Drop a PDF file"
                />

                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className={`doc-tool-button cursor-target${mode === "images" ? " is-active" : ""}`}
                        onClick={() => setMode("images")}
                    >
                        To Images
                    </button>
                    <button
                        type="button"
                        className={`doc-tool-button cursor-target${mode === "text" ? " is-active" : ""}`}
                        onClick={() => setMode("text")}
                    >
                        To Text
                    </button>
                </div>

                {mode === "images" ? (
                    <div className="doc-tool-grid doc-tool-grid--2" style={{ marginTop: "1rem" }}>
                        <div>
                            <label className="doc-tool-label">Format</label>
                            <select
                                className="doc-tool-select cursor-target"
                                value={format}
                                onChange={(e) => setFormat(e.target.value)}
                            >
                                <option value="png">PNG</option>
                                <option value="jpeg">JPEG</option>
                            </select>
                        </div>
                        <div>
                            <label className="doc-tool-label">Resolution scale</label>
                            <input
                                className="doc-tool-range cursor-target"
                                type="range"
                                min="1"
                                max="4"
                                step="0.5"
                                value={scale}
                                onChange={(e) => setScale(Number(e.target.value))}
                            />
                            <div className="doc-tool-range-meta">
                                <span>1x</span>
                                <span>{scale}x</span>
                                <span>4x</span>
                            </div>
                        </div>
                    </div>
                ) : null}

                {running ? <ProgressBar value={progress} /> : null}

                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={handleConvert}
                        disabled={running || !file}
                    >
                        Convert
                    </button>
                </div>
                {status ? <p className="doc-tool-status">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default FromPdf;

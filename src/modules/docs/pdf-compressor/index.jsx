import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import ProgressBar from "../_shared/ProgressBar";
import { downloadBytes, formatFileSize, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { compressPdf } from "../_shared/pdfUtils";
import { useWorkerTask } from "../_shared/useWorkerTask";

const WORKER_URL = new URL("../_shared/workers/docWorker.js", import.meta.url);

function PdfCompressor() {
    const [files, setFiles] = useState([]);
    const [quality, setQuality] = useState(0.6);
    const [scale, setScale] = useState(1.2);
    const [status, setStatus] = useState("");
    const [localProgress, setLocalProgress] = useState(0);
    const { run, running, progress, error, setProgress } = useWorkerTask(WORKER_URL);

    const compressOne = async (file, index, total) => {
        const buffer = await readFileAsArrayBuffer(file);
        try {
            return await run({
                task: "compress",
                payload: { buffer, quality, scale },
            });
        } catch {
            return compressPdf(buffer, {
                quality,
                scale,
                onProgress: (pct) => setProgress(((index + pct / 100) / total) * 100),
            });
        }
    };

    const handleCompress = async () => {
        if (!files.length) return;
        setStatus("Compressing PDF…");
        setLocalProgress(0);

        try {
            for (let i = 0; i < files.length; i += 1) {
                const file = files[i];
                setStatus(`Compressing ${file.name} (${i + 1}/${files.length})…`);
                const result = await compressOne(file, i, files.length);
                downloadBytes(
                    result,
                    `${getBaseName(file.name)}-compressed.pdf`,
                    "application/pdf",
                );
                const saved = ((1 - result.byteLength / file.size) * 100).toFixed(1);
                setLocalProgress(((i + 1) / files.length) * 100);
                setStatus(
                    `Compressed ${file.name}: ${formatFileSize(file.size)} → ${formatFileSize(result.byteLength)} (${saved}% reduction).`,
                );
            }
        } catch (compressError) {
            setStatus(compressError?.message ?? "Compression failed.");
        }
    };

    return (
        <DocToolShell
            title="PDF Compressor"
            description="Re-encode PDF pages at reduced quality to shrink file size. Drop one or more PDFs, then compress."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    multiple
                    files={files}
                    onFiles={setFiles}
                    label="Drop PDF file(s)"
                    hint="Compression starts only when you click Compress"
                />

                <div className="doc-tool-grid doc-tool-grid--2" style={{ marginTop: "1rem" }}>
                    <div>
                        <label className="doc-tool-label">JPEG quality ({quality})</label>
                        <input
                            className="doc-tool-range cursor-target"
                            type="range"
                            min="0.2"
                            max="1"
                            step="0.05"
                            value={quality}
                            onChange={(e) => setQuality(Number(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="doc-tool-label">Render scale ({scale}x)</label>
                        <input
                            className="doc-tool-range cursor-target"
                            type="range"
                            min="0.8"
                            max="2"
                            step="0.1"
                            value={scale}
                            onChange={(e) => setScale(Number(e.target.value))}
                        />
                    </div>
                </div>

                {running ? <ProgressBar value={progress} label="Compressing pages…" /> : null}
                {!running && localProgress > 0 && localProgress < 100 ? (
                    <ProgressBar value={localProgress} label="Compressing files…" />
                ) : null}

                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={handleCompress}
                        disabled={running || !files.length}
                    >
                        Compress & Download
                    </button>
                </div>

                {error ? <p className="doc-tool-status doc-tool-status--error">{error}</p> : null}
                {status && !running ? <p className="doc-tool-status doc-tool-status--success">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default PdfCompressor;

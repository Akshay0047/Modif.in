import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import ProgressBar from "../_shared/ProgressBar";
import { downloadBytes, formatFileSize, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { useWorkerTask } from "../_shared/useWorkerTask";

const WORKER_URL = new URL("../_shared/workers/docWorker.js", import.meta.url);

function PdfCompressor() {
    const [file, setFile] = useState(null);
    const [quality, setQuality] = useState(0.6);
    const [scale, setScale] = useState(1.2);
    const [status, setStatus] = useState("");
    const { run, running, progress, error } = useWorkerTask(WORKER_URL);

    const handleCompress = async (files) => {
        const next = files[0] ?? null;
        setFile(next);
        if (!next) return;

        setStatus("Compressing PDF in background worker…");

        try {
            const buffer = await readFileAsArrayBuffer(next);
            const result = await run({
                task: "compress",
                payload: { buffer, quality, scale },
            });

            downloadBytes(
                result,
                `${getBaseName(next.name)}-compressed.pdf`,
                "application/pdf",
            );

            const saved = ((1 - result.byteLength / next.size) * 100).toFixed(1);
            setStatus(
                `Compressed: ${formatFileSize(next.size)} → ${formatFileSize(result.byteLength)} (${saved}% reduction).`,
            );
        } catch (compressError) {
            setStatus(compressError?.message ?? "Compression failed.");
        }
    };

    return (
        <DocToolShell
            title="PDF Compressor"
            description="Re-encode embedded images at reduced quality to shrink PDF file size."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    files={file ? [file] : []}
                    onFiles={handleCompress}
                    label="Drop a PDF file"
                    hint="Heavy processing runs in a Web Worker"
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
                {error ? <p className="doc-tool-status doc-tool-status--error">{error}</p> : null}
                {status && !running ? <p className="doc-tool-status doc-tool-status--success">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default PdfCompressor;

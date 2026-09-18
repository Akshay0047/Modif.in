import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import ProgressBar from "../_shared/components/ProgressBar";
import { downloadBytes } from "../_shared/downloadUtils";
import { formatFileSize, readFileAsArrayBuffer, replaceExtension } from "../_shared/fileUtils";
import { useWorkerTask } from "../_shared/useWorkerTask";

const createWorker = () =>
    new Worker(new URL("../_shared/workers/docWorker.js", import.meta.url), {
        type: "module",
    });

function PdfCompressor() {
    const [file, setFile] = useState(null);
    const [quality, setQuality] = useState(0.65);
    const [scale, setScale] = useState(1.2);
    const [originalSize, setOriginalSize] = useState(0);
    const [compressedSize, setCompressedSize] = useState(0);
    const { runTask, loading, progress, status, error } = useWorkerTask(createWorker);

    const compress = async () => {
        if (!file) return;
        setOriginalSize(file.size);
        const buffer = await readFileAsArrayBuffer(file);
        const bytes = await runTask("compress-pdf", { buffer, quality, scale });
        setCompressedSize(bytes.byteLength);
        downloadBytes(bytes, replaceExtension(file.name, "-compressed.pdf"), "application/pdf");
    };

    return (
        <DocToolShell
            title="PDF Compressor"
            description="Re-encode PDF page images at reduced quality to shrink file size."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone accept=".pdf,application/pdf" label="Drop a PDF to compress" onFiles={(files) => setFile(files[0] ?? null)} disabled={loading} />
                <div className="doc-tool-grid doc-tool-grid--2" style={{ marginTop: "1rem" }}>
                    <div>
                        <label className="doc-tool-label">JPEG quality ({quality})</label>
                        <input className="doc-tool-range cursor-target" type="range" min="0.3" max="0.95" step="0.05" value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="doc-tool-label">Render scale ({scale}x)</label>
                        <input className="doc-tool-range cursor-target" type="range" min="0.8" max="2" step="0.1" value={scale} onChange={(e) => setScale(Number(e.target.value))} />
                    </div>
                </div>
                <div className="doc-tool-controls">
                    <button type="button" className="doc-tool-button doc-tool-button--primary cursor-target" onClick={compress} disabled={!file || loading}>
                        {loading ? "Compressing…" : "Compress & Download"}
                    </button>
                </div>
                {loading ? <ProgressBar value={progress} label={status} /> : null}
                {originalSize && compressedSize ? (
                    <p className="doc-tool-status">
                        {formatFileSize(originalSize)} → {formatFileSize(compressedSize)}
                    </p>
                ) : null}
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default PdfCompressor;

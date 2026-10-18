import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import PdfPreview from "../_shared/PdfPreview";
import ProgressBar from "../_shared/ProgressBar";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import {
    addPageNumbers,
    addWatermark,
    compressPdf,
    flattenPdf,
    mergePdfBuffers,
    rgb,
    stripMetadata,
} from "../_shared/pdfUtils";
import { createDocWorker } from "../_shared/createDocWorker";
import { useWorkerTask } from "../_shared/useWorkerTask";

const OPERATIONS = [
    { id: "merge", label: "Merge" },
    { id: "flatten", label: "Flatten" },
    { id: "compress", label: "Compress" },
    { id: "watermark", label: "Watermark" },
    { id: "paginate", label: "Page Numbers" },
    { id: "strip-meta", label: "Strip Metadata" },
];

function hexToRgb(hex) {
    const value = hex.replace("#", "");
    const int = Number.parseInt(value, 16);
    return rgb(
        ((int >> 16) & 255) / 255,
        ((int >> 8) & 255) / 255,
        (int & 255) / 255,
    );
}

async function runPipeline(buffers, steps, workerRun, setProgress, watermark) {
    let current = buffers.length === 1 ? buffers[0] : await mergePdfBuffers(buffers);

    for (let i = 0; i < steps.length; i += 1) {
        const step = steps[i];
        if (step === "merge" && buffers.length > 1) {
            current = await mergePdfBuffers(buffers);
        } else if (step === "flatten") {
            current = await flattenPdf(current);
        } else if (step === "compress") {
            try {
                current = await workerRun({
                    task: "compress",
                    payload: { buffer: current, quality: 0.6, scale: 1.2 },
                });
            } catch (workerError) {
                if (workerError?.name === "AbortError") throw workerError;
                current = await compressPdf(current, {
                    quality: 0.6,
                    scale: 1.2,
                    onProgress: (pct) => setProgress(pct),
                });
            }
        } else if (step === "watermark") {
            current = await addWatermark(current, {
                text: watermark.text || "PROCESSED",
                opacity: watermark.opacity,
                fontSize: watermark.fontSize,
                angle: watermark.angle,
                tile: watermark.tile,
                color: hexToRgb(watermark.color),
            });
        } else if (step === "paginate") {
            current = await addPageNumbers(current);
        } else if (step === "strip-meta") {
            current = await stripMetadata(current);
        }
        setProgress?.(((i + 1) / steps.length) * 100);
    }

    return current;
}

function BatchWorkflowAutomation() {
    const [files, setFiles] = useState([]);
    const [pipeline, setPipeline] = useState(["flatten", "compress"]);
    const [status, setStatus] = useState("");
    const [previewBytes, setPreviewBytes] = useState(null);
    const [watermark, setWatermark] = useState({
        text: "PROCESSED",
        opacity: 0.2,
        fontSize: 36,
        angle: -45,
        color: "#808080",
        tile: false,
    });
    const { run, running, progress, error, setProgress } = useWorkerTask(createDocWorker);

    const toggleStep = (id) => {
        setPipeline((prev) =>
            prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
        );
        setPreviewBytes(null);
    };

    const buildResult = async () => {
        const buffers = await Promise.all(files.map((f) => readFileAsArrayBuffer(f)));
        return runPipeline(buffers, pipeline, run, setProgress, watermark);
    };

    const handlePreview = async () => {
        if (!files.length || !pipeline.length) return;
        setStatus("Building pipeline preview…");
        try {
            const result = await buildResult();
            setPreviewBytes(result);
            setStatus("Preview ready.");
        } catch (pipelineError) {
            if (pipelineError?.name === "AbortError") return;
            setStatus(pipelineError?.message ?? "Pipeline failed.");
        }
    };

    const handleRun = async () => {
        if (!files.length || !pipeline.length) return;
        setStatus("Running pipeline…");

        try {
            const result = await buildResult();
            setPreviewBytes(result);
            const name = files.length === 1
                ? getBaseName(files[0].name)
                : "batch";
            downloadBytes(result, `${name}-processed.pdf`, "application/pdf");
            setStatus(`Pipeline complete: ${pipeline.join(" → ")}`);
        } catch (pipelineError) {
            if (pipelineError?.name === "AbortError") return;
            setStatus(pipelineError?.message ?? "Pipeline failed.");
        }
    };

    return (
        <DocToolShell
            title="Batch Workflow Automation"
            description="Chain multiple PDF operations sequentially, preview the result, then download once."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    multiple
                    files={files}
                    onFiles={(next) => {
                        setFiles(next);
                        setPreviewBytes(null);
                    }}
                    label="Drop PDF file(s)"
                    hint="Multiple files will be merged first if Merge is in the pipeline"
                />

                <label className="doc-tool-label" style={{ marginTop: "1rem" }}>
                    Pipeline steps (in order)
                </label>
                <div className="doc-tool-controls">
                    {OPERATIONS.map((op) => (
                        <button
                            key={op.id}
                            type="button"
                            className={`doc-tool-button cursor-target${
                                pipeline.includes(op.id) ? " is-active" : ""
                            }`}
                            onClick={() => toggleStep(op.id)}
                        >
                            {op.label}
                        </button>
                    ))}
                </div>

                {pipeline.includes("watermark") ? (
                    <div className="doc-tool-grid doc-tool-grid--2" style={{ marginTop: "0.5rem" }}>
                        <div>
                            <label className="doc-tool-label">Watermark text</label>
                            <input
                                className="doc-tool-input cursor-target"
                                value={watermark.text}
                                onChange={(e) => {
                                    setWatermark((prev) => ({ ...prev, text: e.target.value }));
                                    setPreviewBytes(null);
                                }}
                            />
                        </div>
                        <div>
                            <label className="doc-tool-label">Orientation ({watermark.angle}°)</label>
                            <input
                                className="doc-tool-range cursor-target"
                                type="range"
                                min="-90"
                                max="90"
                                value={watermark.angle}
                                onChange={(e) => {
                                    setWatermark((prev) => ({ ...prev, angle: Number(e.target.value) }));
                                    setPreviewBytes(null);
                                }}
                            />
                        </div>
                        <div>
                            <label className="doc-tool-label">Opacity ({watermark.opacity})</label>
                            <input
                                className="doc-tool-range cursor-target"
                                type="range"
                                min="0.1"
                                max="1"
                                step="0.05"
                                value={watermark.opacity}
                                onChange={(e) => {
                                    setWatermark((prev) => ({ ...prev, opacity: Number(e.target.value) }));
                                    setPreviewBytes(null);
                                }}
                            />
                        </div>
                        <div>
                            <label className="doc-tool-label">Color</label>
                            <input
                                className="doc-tool-input cursor-target"
                                type="color"
                                value={watermark.color}
                                onChange={(e) => {
                                    setWatermark((prev) => ({ ...prev, color: e.target.value }));
                                    setPreviewBytes(null);
                                }}
                            />
                        </div>
                        <div>
                            <button
                                type="button"
                                className={`doc-tool-button cursor-target${watermark.tile ? " is-active" : ""}`}
                                onClick={() => {
                                    setWatermark((prev) => ({ ...prev, tile: !prev.tile }));
                                    setPreviewBytes(null);
                                }}
                            >
                                Tile watermark
                            </button>
                        </div>
                    </div>
                ) : null}

                {pipeline.length > 0 ? (
                    <p className="doc-tool-status">
                        Order: {pipeline.map((s) => OPERATIONS.find((o) => o.id === s)?.label).join(" → ")}
                    </p>
                ) : null}

                {running ? <ProgressBar value={progress} label="Processing pipeline…" /> : null}

                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className="doc-tool-button cursor-target"
                        onClick={handlePreview}
                        disabled={running || !files.length || !pipeline.length}
                    >
                        {previewBytes ? "Refresh Preview" : "Preview PDF"}
                    </button>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={handleRun}
                        disabled={running || !files.length || !pipeline.length}
                    >
                        Save & Download
                    </button>
                </div>

                {error ? <p className="doc-tool-status doc-tool-status--error">{error}</p> : null}
                {status && !running ? <p className="doc-tool-status doc-tool-status--success">{status}</p> : null}
            </div>

            {previewBytes ? (
                <div className="doc-tool-panel">
                    <h2 className="doc-tool-section-title">Pipeline preview</h2>
                    <PdfPreview bytes={previewBytes} title="Processed PDF preview" />
                </div>
            ) : null}
        </DocToolShell>
    );
}

export default BatchWorkflowAutomation;

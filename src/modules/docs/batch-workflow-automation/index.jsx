import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import ProgressBar from "../_shared/ProgressBar";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import {
    addPageNumbers,
    addWatermark,
    flattenPdf,
    mergePdfBuffers,
    rgb,
    stripMetadata,
} from "../_shared/pdfUtils";
import { useWorkerTask } from "../_shared/useWorkerTask";

const WORKER_URL = new URL("../_shared/workers/docWorker.js", import.meta.url);

const OPERATIONS = [
    { id: "merge", label: "Merge" },
    { id: "flatten", label: "Flatten" },
    { id: "compress", label: "Compress" },
    { id: "watermark", label: "Watermark" },
    { id: "paginate", label: "Page Numbers" },
    { id: "strip-meta", label: "Strip Metadata" },
];

async function runPipeline(buffers, steps, workerRun) {
    let current = buffers.length === 1 ? buffers[0] : await mergePdfBuffers(buffers);

    for (const step of steps) {
        if (step === "merge" && buffers.length > 1) {
            current = await mergePdfBuffers(buffers);
        } else if (step === "flatten") {
            current = await flattenPdf(current);
        } else if (step === "compress") {
            current = await workerRun({
                task: "compress",
                payload: { buffer: current, quality: 0.6, scale: 1.2 },
            });
        } else if (step === "watermark") {
            current = await addWatermark(current, {
                text: "PROCESSED",
                opacity: 0.2,
                fontSize: 36,
                angle: -45,
                color: rgb(0.5, 0.5, 0.5),
            });
        } else if (step === "paginate") {
            current = await addPageNumbers(current);
        } else if (step === "strip-meta") {
            current = await stripMetadata(current);
        }
    }

    return current;
}

function BatchWorkflowAutomation() {
    const [files, setFiles] = useState([]);
    const [pipeline, setPipeline] = useState(["flatten", "compress"]);
    const [status, setStatus] = useState("");
    const { run, running, progress, error } = useWorkerTask(WORKER_URL);

    const toggleStep = (id) => {
        setPipeline((prev) =>
            prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
        );
    };

    const handleRun = async () => {
        if (!files.length || !pipeline.length) return;
        setStatus("Running pipeline…");

        try {
            const buffers = await Promise.all(
                files.map((f) => readFileAsArrayBuffer(f)),
            );
            const result = await runPipeline(buffers, pipeline, run);
            const name = files.length === 1
                ? getBaseName(files[0].name)
                : "batch";
            downloadBytes(result, `${name}-processed.pdf`, "application/pdf");
            setStatus(`Pipeline complete: ${pipeline.join(" → ")}`);
        } catch (pipelineError) {
            setStatus(pipelineError?.message ?? "Pipeline failed.");
        }
    };

    return (
        <DocToolShell
            title="Batch Workflow Automation"
            description="Chain multiple PDF operations sequentially before a single download."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    multiple
                    files={files}
                    onFiles={setFiles}
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

                {pipeline.length > 0 ? (
                    <p className="doc-tool-status">
                        Order: {pipeline.map((s) => OPERATIONS.find((o) => o.id === s)?.label).join(" → ")}
                    </p>
                ) : null}

                {running ? <ProgressBar value={progress} label="Processing pipeline…" /> : null}

                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={handleRun}
                        disabled={running || !files.length || !pipeline.length}
                    >
                        Run Pipeline & Download
                    </button>
                </div>

                {error ? <p className="doc-tool-status doc-tool-status--error">{error}</p> : null}
                {status && !running ? <p className="doc-tool-status doc-tool-status--success">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default BatchWorkflowAutomation;

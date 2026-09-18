import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import ProgressBar from "../_shared/components/ProgressBar";
import { downloadBytes } from "../_shared/downloadUtils";
import { readFileAsArrayBuffer, replaceExtension } from "../_shared/fileUtils";
import { drawWatermark, loadPdfLibDocument } from "../_shared/pdfUtils";
import { createDocWorker } from "../_shared/createDocWorker";
import { useWorkerTask } from "../_shared/useWorkerTask";

const STEPS = [
    { id: "merge", label: "Merge PDFs" },
    { id: "flatten", label: "Flatten forms" },
    { id: "compress", label: "Compress" },
    { id: "watermark", label: "Watermark" },
];

function BatchWorkflowAutomation() {
    const [files, setFiles] = useState([]);
    const [pipeline, setPipeline] = useState(["merge", "flatten", "compress"]);
    const [watermarkText, setWatermarkText] = useState("BATCH");
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { runTask } = useWorkerTask(createDocWorker);

    const toggleStep = (stepId) => {
        setPipeline((current) =>
            current.includes(stepId)
                ? current.filter((entry) => entry !== stepId)
                : [...current, stepId],
        );
    };

    const runPipeline = async () => {
        if (!files.length) return;
        setLoading(true);
        setError("");
        setProgress(0);
        try {
            let workingBuffer;

            if (pipeline.includes("merge")) {
                setStatus("Merging PDFs…");
                const buffers = await Promise.all(files.map((file) => readFileAsArrayBuffer(file)));
                workingBuffer = await runTask("merge-pdfs", { buffers });
                setProgress(25);
            } else {
                workingBuffer = await readFileAsArrayBuffer(files[0]);
            }

            if (pipeline.includes("flatten")) {
                setStatus("Flattening forms…");
                const pdf = await loadPdfLibDocument(workingBuffer);
                pdf.getForm().flatten();
                workingBuffer = await pdf.save();
                setProgress(50);
            }

            if (pipeline.includes("compress")) {
                setStatus("Compressing…");
                workingBuffer = await runTask("compress-pdf", {
                    buffer: workingBuffer,
                    quality: 0.7,
                    scale: 1.2,
                });
                setProgress(75);
            }

            if (pipeline.includes("watermark")) {
                setStatus("Applying watermark…");
                const pdf = await loadPdfLibDocument(workingBuffer);
                for (const page of pdf.getPages()) {
                    await drawWatermark(page, pdf, watermarkText, { opacity: 0.15, tile: true });
                }
                workingBuffer = await pdf.save();
            }

            setProgress(100);
            setStatus("Pipeline complete.");
            const base = files.length === 1 ? files[0].name : "batch-output.pdf";
            downloadBytes(workingBuffer, replaceExtension(base, "-workflow.pdf"), "application/pdf");
        } catch (pipelineError) {
            setError(pipelineError instanceof Error ? pipelineError.message : "Pipeline failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DocToolShell
            title="Batch Workflow Automation"
            description="Chain document operations in-memory before downloading a single output file."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    multiple
                    label="Drop one or more PDFs"
                    onFiles={(incoming) => setFiles((current) => [...current, ...incoming])}
                    disabled={loading}
                />
                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    {STEPS.map((step) => (
                        <button
                            key={step.id}
                            type="button"
                            className={`doc-tool-button cursor-target${pipeline.includes(step.id) ? " is-active" : ""}`}
                            onClick={() => toggleStep(step.id)}
                            disabled={loading}
                        >
                            {step.label}
                        </button>
                    ))}
                </div>
                {pipeline.includes("watermark") ? (
                    <input
                        className="doc-tool-input cursor-target"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="Watermark text"
                    />
                ) : null}
                <div className="doc-tool-controls">
                    <button type="button" className="doc-tool-button doc-tool-button--primary cursor-target" onClick={runPipeline} disabled={!files.length || loading}>
                        Run pipeline
                    </button>
                    <button type="button" className="doc-tool-button cursor-target" onClick={() => setFiles([])} disabled={loading}>
                        Clear files
                    </button>
                </div>
                {loading ? <ProgressBar value={progress} label={status} /> : null}
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default BatchWorkflowAutomation;

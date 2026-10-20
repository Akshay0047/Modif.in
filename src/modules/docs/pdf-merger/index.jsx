import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import PdfPreview from "../_shared/PdfPreview";
import ProgressBar from "../_shared/ProgressBar";
import { downloadBytes, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { createDocWorker } from "../_shared/createDocWorker";
import { useWorkerTask } from "../_shared/useWorkerTask";

function PdfMerger() {
    const [files, setFiles] = useState([]);
    const [previewFile, setPreviewFile] = useState(null);
    const [mergedBytes, setMergedBytes] = useState(null);
    const [status, setStatus] = useState("");
    const { run, running, progress, error } = useWorkerTask(createDocWorker);

    const buildMerged = async () => {
        const buffers = await Promise.all(files.map((file) => readFileAsArrayBuffer(file)));
        try {
            return await run({
                task: "merge",
                payload: { buffers },
            });
        } catch (workerError) {
            if (workerError?.name === "AbortError") throw workerError;
            const { mergePdfBuffers } = await import("../_shared/pdfUtils");
            return mergePdfBuffers(buffers);
        }
    };

    const handlePreviewMerged = async () => {
        if (files.length < 2) {
            setStatus("Select at least two PDF files to merge.");
            return;
        }
        setStatus("Building merged preview…");
        try {
            const merged = await buildMerged();
            setMergedBytes(merged);
            setPreviewFile(null);
            setStatus("Merged preview ready.");
        } catch (mergeError) {
            if (mergeError?.name === "AbortError") return;
            setStatus(mergeError?.message ?? "Failed to merge PDFs.");
        }
    };

    const handleDownload = async () => {
        if (files.length < 2) {
            setStatus("Select at least two PDF files to merge.");
            return;
        }

        setStatus("Merging PDFs…");
        try {
            const merged = mergedBytes ?? await buildMerged();
            if (!mergedBytes) setMergedBytes(merged);
            downloadBytes(merged, "merged.pdf", "application/pdf");
            setStatus("Merged PDF downloaded successfully.");
        } catch (mergeError) {
            if (mergeError?.name === "AbortError") return;
            setStatus(mergeError?.message ?? "Failed to merge PDFs.");
        }
    };

    return (
        <DocToolShell
            title="PDF Merger"
            description="Combine multiple PDF files into a single document. Reorder files before previewing or downloading."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    multiple
                    reorderable
                    files={files}
                    onFiles={(next) => {
                        setFiles(next);
                        setMergedBytes(null);
                    }}
                    onPreview={(file) => {
                        setPreviewFile(file);
                        setMergedBytes(null);
                    }}
                    label="Drop PDF files here"
                    hint="Select two or more PDFs — use Up/Down to change merge order"
                />

                {running ? <ProgressBar value={progress} label="Merging pages…" /> : null}

                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className="doc-tool-button cursor-target"
                        onClick={handlePreviewMerged}
                        disabled={running || files.length < 2}
                    >
                        Preview Merged PDF
                    </button>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={handleDownload}
                        disabled={running || files.length < 2}
                    >
                        Save & Download
                    </button>
                    {files.length > 0 ? (
                        <button
                            type="button"
                            className="doc-tool-button cursor-target"
                            onClick={() => {
                                setFiles([]);
                                setPreviewFile(null);
                                setMergedBytes(null);
                            }}
                            disabled={running}
                        >
                            Clear All
                        </button>
                    ) : null}
                </div>

                {error ? <p className="doc-tool-status doc-tool-status--error">{error}</p> : null}
                {status ? (
                    <p className={`doc-tool-status${status.includes("success") || status.includes("ready") ? " doc-tool-status--success" : ""}`}>
                        {status}
                    </p>
                ) : null}
            </div>

            {previewFile || mergedBytes ? (
                <div className="doc-tool-panel">
                    <h2 className="doc-tool-section-title">
                        {mergedBytes ? "Merged preview" : `Preview: ${previewFile.name}`}
                    </h2>
                    <PdfPreview
                        file={mergedBytes ? null : previewFile}
                        bytes={mergedBytes}
                        title={mergedBytes ? "Merged PDF preview" : previewFile.name}
                    />
                </div>
            ) : null}
        </DocToolShell>
    );
}

export default PdfMerger;

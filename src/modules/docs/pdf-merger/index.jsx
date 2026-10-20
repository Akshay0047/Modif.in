import { useEffect, useRef, useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import PdfPreview from "../_shared/PdfPreview";
import ProgressBar from "../_shared/ProgressBar";
import { downloadBytes, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { createDocWorker } from "../_shared/createDocWorker";
import { useWorkerTask } from "../_shared/useWorkerTask";
import { workerTaskAborted } from "../_shared/workerTaskRunner";

function PdfMerger() {
    const [files, setFiles] = useState([]);
    const [previewFile, setPreviewFile] = useState(null);
    const [mergedBytes, setMergedBytes] = useState(null);
    const [status, setStatus] = useState("");
    const [running, setRunning] = useState(false);
    const [failed, setFailed] = useState(false);
    const generationRef = useRef(0);
    const busyRef = useRef(false);
    const { run, progress } = useWorkerTask(createDocWorker);

    useEffect(() => () => {
        generationRef.current += 1;
        busyRef.current = false;
    }, []);

    const invalidate = () => {
        generationRef.current += 1;
        busyRef.current = false;
        setRunning(false);
        setStatus("");
        setFailed(false);
    };
    const assertCurrent = (generation) => {
        if (generation !== generationRef.current) throw workerTaskAborted();
    };

    const buildMerged = async (generation) => {
        const buffers = await Promise.all(files.map((file) => readFileAsArrayBuffer(file)));
        assertCurrent(generation);
        try {
            return await run({
                task: "merge",
                payload: { buffers },
            });
        } catch (workerError) {
            assertCurrent(generation);
            if (workerError?.name === "AbortError") throw workerError;
            const { mergePdfBuffers } = await import("../_shared/pdfUtils");
            assertCurrent(generation);
            return mergePdfBuffers(buffers);
        }
    };

    const handleMerge = async (preview) => {
        if (busyRef.current) return;
        if (files.length < 2) {
            setStatus("Select at least two PDF files to merge.");
            return;
        }
        const generation = ++generationRef.current;
        busyRef.current = true;
        setRunning(true);
        setFailed(false);
        setStatus(preview ? "Building merged preview…" : "Merging PDFs…");
        try {
            const merged = mergedBytes ?? await buildMerged(generation);
            assertCurrent(generation);
            setMergedBytes(merged);
            setPreviewFile(null);
            if (!preview) downloadBytes(merged, "merged.pdf", "application/pdf");
            setStatus(preview ? "Merged preview ready." : "Merged PDF downloaded successfully.");
        } catch (mergeError) {
            if (generation !== generationRef.current || mergeError?.name === "AbortError") return;
            setFailed(true);
            setStatus(mergeError?.message ?? "Failed to merge PDFs.");
        } finally {
            if (generation === generationRef.current) {
                busyRef.current = false;
                setRunning(false);
            }
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
                        invalidate();
                        setFiles(next);
                        setMergedBytes(null);
                        setPreviewFile(null);
                    }}
                    onPreview={(file) => {
                        invalidate();
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
                        onClick={() => handleMerge(true)}
                        disabled={running || files.length < 2}
                        aria-busy={running}
                    >
                        Preview Merged PDF
                    </button>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={() => handleMerge(false)}
                        disabled={running || files.length < 2}
                        aria-busy={running}
                    >
                        Save & Download
                    </button>
                    {files.length > 0 ? (
                        <button
                            type="button"
                            className="doc-tool-button cursor-target"
                            onClick={() => {
                                invalidate();
                                setFiles([]);
                                setPreviewFile(null);
                                setMergedBytes(null);
                            }}
                        >
                            Clear All
                        </button>
                    ) : null}
                </div>

                {status ? (
                    <p className={`doc-tool-status${failed ? " doc-tool-status--error" : status.includes("success") || status.includes("ready") ? " doc-tool-status--success" : ""}`}>
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

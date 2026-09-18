import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import ProgressBar from "../_shared/ProgressBar";
import { downloadBytes, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { mergePdfBuffers } from "../_shared/pdfUtils";
import { useWorkerTask } from "../_shared/useWorkerTask";

const WORKER_URL = new URL("../_shared/workers/docWorker.js", import.meta.url);

function PdfMerger() {
    const [files, setFiles] = useState([]);
    const [status, setStatus] = useState("");
    const { run, running, progress, error } = useWorkerTask(WORKER_URL);

    const handleMerge = async () => {
        if (files.length < 2) {
            setStatus("Select at least two PDF files to merge.");
            return;
        }

        setStatus("Merging PDFs…");
        try {
            const buffers = await Promise.all(
                files.map((file) => readFileAsArrayBuffer(file)),
            );

            let merged;
            try {
                merged = await run({
                    task: "merge",
                    payload: { buffers },
                });
            } catch {
                merged = await mergePdfBuffers(buffers);
            }

            downloadBytes(merged, "merged.pdf", "application/pdf");
            setStatus("Merged PDF downloaded successfully.");
        } catch (mergeError) {
            setStatus(mergeError?.message ?? "Failed to merge PDFs.");
        }
    };

    return (
        <DocToolShell
            title="PDF Merger"
            description="Combine multiple PDF files into a single document. Files are merged in the order shown."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    multiple
                    files={files}
                    onFiles={setFiles}
                    label="Drop PDF files here"
                    hint="Select two or more PDFs — order matters"
                />

                {running ? <ProgressBar value={progress} label="Merging pages…" /> : null}

                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={handleMerge}
                        disabled={running || files.length < 2}
                    >
                        Merge & Download
                    </button>
                    {files.length > 0 ? (
                        <button
                            type="button"
                            className="doc-tool-button cursor-target"
                            onClick={() => setFiles([])}
                            disabled={running}
                        >
                            Clear All
                        </button>
                    ) : null}
                </div>

                {error ? <p className="doc-tool-status doc-tool-status--error">{error}</p> : null}
                {status ? (
                    <p className={`doc-tool-status${status.includes("success") ? " doc-tool-status--success" : ""}`}>
                        {status}
                    </p>
                ) : null}
            </div>
        </DocToolShell>
    );
}

export default PdfMerger;

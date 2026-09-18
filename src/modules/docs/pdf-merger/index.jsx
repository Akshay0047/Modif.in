import { useCallback, useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import ProgressBar from "../_shared/components/ProgressBar";
import { downloadBytes } from "../_shared/downloadUtils";
import { formatFileSize, readFileAsArrayBuffer } from "../_shared/fileUtils";
import { createDocWorker } from "../_shared/createDocWorker";
import { useWorkerTask } from "../_shared/useWorkerTask";

function PdfMerger() {
    const [files, setFiles] = useState([]);
    const { runTask, loading, progress, status, error } = useWorkerTask(createDocWorker);

    const totalSize = useMemo(
        () => files.reduce((sum, file) => sum + file.size, 0),
        [files],
    );

    const handleMerge = async () => {
        const buffers = await Promise.all(files.map((file) => readFileAsArrayBuffer(file)));
        const bytes = await runTask("merge-pdfs", { buffers });
        downloadBytes(bytes, "merged.pdf", "application/pdf");
    };

    const removeFile = useCallback((index) => {
        setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    }, []);

    return (
        <DocToolShell
            title="PDF Merger"
            description="Combine multiple PDF files into one document. Processing runs entirely in your browser."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    multiple
                    label="Drop PDF files here or click to browse"
                    hint="Files are merged in the order shown below."
                    onFiles={(incoming) => setFiles((current) => [...current, ...incoming])}
                    disabled={loading}
                />

                {files.length ? (
                    <ul className="doc-tool-file-list" style={{ marginTop: "1rem" }}>
                        {files.map((file, index) => (
                            <li key={`${file.name}-${index}`} className="doc-tool-file-list__item">
                                <span>{index + 1}. {file.name} ({formatFileSize(file.size)})</span>
                                <button
                                    type="button"
                                    className="doc-tool-button cursor-target"
                                    onClick={() => removeFile(index)}
                                    disabled={loading}
                                >
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="doc-tool-empty" style={{ marginTop: "1rem" }}>
                        No PDF files selected yet.
                    </p>
                )}

                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={handleMerge}
                        disabled={files.length < 2 || loading}
                    >
                        {loading ? "Merging…" : "Merge & Download"}
                    </button>
                    <button
                        type="button"
                        className="doc-tool-button cursor-target"
                        onClick={() => setFiles([])}
                        disabled={!files.length || loading}
                    >
                        Clear
                    </button>
                </div>

                {loading ? <ProgressBar value={progress} label={status || "Merging PDFs…"} /> : null}
                {error ? <p className="doc-tool-error">{error}</p> : null}
                {files.length ? (
                    <p className="doc-tool-status">Total input size: {formatFileSize(totalSize)}</p>
                ) : null}
            </div>
        </DocToolShell>
    );
}

export default PdfMerger;

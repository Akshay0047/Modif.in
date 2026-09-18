import { useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../../text/_shared/CopyButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import ProgressBar from "../_shared/ProgressBar";
import { readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { loadPdfWithPdfJs, renderPageToCanvas } from "../_shared/pdfUtils";
import { useWorkerTask } from "../_shared/useWorkerTask";

const WORKER_URL = new URL("../_shared/workers/docWorker.js", import.meta.url);

function Ocr() {
    const [text, setText] = useState("");
    const [status, setStatus] = useState("");
    const { run, running, progress, error } = useWorkerTask(WORKER_URL);

    const handleFile = async (files) => {
        const file = files[0];
        if (!file) return;

        setStatus("Running OCR…");
        setText("");

        try {
            let imageData;

            if (file.type.startsWith("image/")) {
                const buffer = await readFileAsArrayBuffer(file);
                const blob = new Blob([buffer], { type: file.type });
                imageData = URL.createObjectURL(blob);
            } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
                const buffer = await readFileAsArrayBuffer(file);
                const pdf = await loadPdfWithPdfJs(buffer);
                const canvas = await renderPageToCanvas(pdf, 1, 2);
                pdf.destroy();
                imageData = canvas.toDataURL("image/png");
                canvas.width = 0;
                canvas.height = 0;
            } else {
                throw new Error("Upload an image or PDF file.");
            }

            const result = await run({
                task: "ocr",
                payload: { imageData, lang: "eng" },
            });

            if (imageData.startsWith("blob:")) URL.revokeObjectURL(imageData);

            setText(result.text ?? "");
            setStatus(`OCR complete — ${(result.confidence ?? 0).toFixed(1)}% confidence.`);
        } catch (ocrError) {
            setStatus(ocrError?.message ?? "OCR failed.");
        }
    };

    return (
        <DocToolShell
            title="OCR"
            description="Extract text from scanned images and PDF pages using optical character recognition."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".png,.jpg,.jpeg,.pdf,image/*,application/pdf"
                    onFiles={handleFile}
                    label="Drop an image or PDF"
                    hint="Processing runs in a background Web Worker"
                />
                {running ? <ProgressBar value={progress} label="Recognizing text…" /> : null}
                {error ? <p className="doc-tool-status doc-tool-status--error">{error}</p> : null}
            </div>

            {text ? (
                <div className="doc-tool-panel">
                    <div className="doc-tool-output-header">
                        <h2 className="doc-tool-section-title">Recognized Text</h2>
                        <CopyButton text={text} />
                    </div>
                    <textarea className="doc-tool-textarea" value={text} readOnly />
                </div>
            ) : null}

            {status && !running ? <p className="doc-tool-status">{status}</p> : null}
        </DocToolShell>
    );
}

export default Ocr;

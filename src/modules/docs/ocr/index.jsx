import { useState } from "react";
import ReactMarkdown from "react-markdown";
import BackButton from "../../../components/BackButton";
import CopyButton from "../../text/_shared/CopyButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import ProgressBar from "../_shared/ProgressBar";
import { readFileAsDataUrl } from "../_shared/fileUtils";
import { loadPdfWithPdfJs, renderPageToCanvas } from "../_shared/pdfUtils";
import { createDocWorker } from "../_shared/createDocWorker";
import { useWorkerTask } from "../_shared/useWorkerTask";

function ocrToMarkdown(data) {
    const paragraphs = data?.paragraphs?.length
        ? data.paragraphs
        : (data?.text ?? "").split(/\n{2,}/).map((text) => ({ text }));

    return paragraphs
        .map((paragraph) => {
            const text = (paragraph.text ?? "").replace(/\s+/g, " ").trim();
            if (!text) return "";
            const height = (paragraph.bbox?.y1 ?? 0) - (paragraph.bbox?.y0 ?? 0);
            if (height > 32 && text.length < 80) return `## ${text}`;
            if (/^([•●\-–—*]|(\d+[.)]))/.test(text)) {
                return `- ${text.replace(/^([•●\-–—*]|(\d+[.)]))\s*/, "")}`;
            }
            return text;
        })
        .filter(Boolean)
        .join("\n\n");
}

function Ocr() {
    const [text, setText] = useState("");
    const [markdown, setMarkdown] = useState("");
    const [view, setView] = useState("txt");
    const [status, setStatus] = useState("");
    const { run, running, progress, error } = useWorkerTask(createDocWorker);

    const recognizeImage = async (imageData) => {
        const result = await run({
            task: "ocr",
            payload: { imageData, lang: "eng" },
        });
        return result;
    };

    const handleFile = async (files) => {
        const file = files[0];
        if (!file) return;

        setStatus("Running OCR…");
        setText("");
        setMarkdown("");

        try {
            const chunks = [];
            const mdChunks = [];

            if (file.type.startsWith("image/")) {
                const imageData = await readFileAsDataUrl(file);
                const result = await recognizeImage(imageData);
                chunks.push(result.text ?? "");
                mdChunks.push(ocrToMarkdown(result));
            } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
                const buffer = await file.arrayBuffer();
                const pdf = await loadPdfWithPdfJs(buffer);
                for (let i = 1; i <= pdf.numPages; i += 1) {
                    setStatus(`Recognizing page ${i} of ${pdf.numPages}…`);
                    const canvas = await renderPageToCanvas(pdf, i, 3);
                    const imageData = canvas.toDataURL("image/png");
                    canvas.width = 0;
                    canvas.height = 0;
                    const result = await recognizeImage(imageData);
                    chunks.push(result.text ?? "");
                    mdChunks.push(`## Page ${i}\n\n${ocrToMarkdown(result)}`);
                }
                pdf.destroy();
            } else {
                throw new Error("Upload an image or PDF file.");
            }

            const nextText = chunks.join("\n\n").trim();
            const nextMarkdown = mdChunks.join("\n\n---\n\n").trim();
            setText(nextText);
            setMarkdown(nextMarkdown);
            setStatus("OCR complete.");
        } catch (ocrError) {
            if (ocrError?.name === "AbortError") return;
            setStatus(ocrError?.message ?? "OCR failed.");
        }
    };

    const visibleText = view === "markdown" ? markdown : text;

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
                    hint="All pages are rendered at high resolution before recognition"
                />
                {running ? <ProgressBar value={progress} label="Recognizing text…" /> : null}
                {error ? <p className="doc-tool-status doc-tool-status--error">{error}</p> : null}
            </div>

            {text ? (
                <div className="doc-tool-panel">
                    <div className="doc-tool-output-header">
                        <h2 className="doc-tool-section-title">Recognized Text</h2>
                        <div className="doc-tool-controls" style={{ marginBottom: 0 }}>
                            <button
                                type="button"
                                className={`doc-tool-button cursor-target${view === "txt" ? " is-active" : ""}`}
                                onClick={() => setView("txt")}
                            >
                                View TXT
                            </button>
                            <button
                                type="button"
                                className={`doc-tool-button cursor-target${view === "markdown" ? " is-active" : ""}`}
                                onClick={() => setView("markdown")}
                            >
                                View Markdown
                            </button>
                            <CopyButton text={visibleText} />
                        </div>
                    </div>
                    {view === "markdown" ? (
                        <div className="doc-tool-markdown">
                            <ReactMarkdown>{markdown}</ReactMarkdown>
                        </div>
                    ) : (
                        <textarea aria-label="Recognized text" className="doc-tool-textarea" value={text} readOnly />
                    )}
                </div>
            ) : null}

            {status && !running ? <p className="doc-tool-status">{status}</p> : null}
        </DocToolShell>
    );
}

export default Ocr;

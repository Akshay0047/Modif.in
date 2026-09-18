import { useEffect, useRef, useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import ProgressBar from "../_shared/components/ProgressBar";
import { downloadBytes, downloadText } from "../_shared/downloadUtils";
import { getBaseName, readFileAsArrayBuffer } from "../_shared/fileUtils";
import { createDocWorker } from "../_shared/createDocWorker";
import { loadPdfJsDocument, renderPageToCanvas, PDFDocument, StandardFonts, rgb } from "../_shared/pdfUtils";
import { useWorkerTask } from "../_shared/useWorkerTask";

function Ocr() {
    const [file, setFile] = useState(null);
    const [text, setText] = useState("");
    const [previewUrl, setPreviewUrl] = useState("");
    const canvasRef = useRef(null);
    const { runTask, loading, progress, status, error } = useWorkerTask(createDocWorker);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const runOcrOnImage = async (imageData, width, height) => {
        const result = await runTask("ocr", { imageData, width, height });
        setText(result.text);
        return result;
    };

    const handleImage = async (arrayBuffer, mimeType) => {
        const blob = new Blob([arrayBuffer], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const img = await new Promise((resolve, reject) => {
            const element = new Image();
            element.onload = () => resolve(element);
            element.onerror = reject;
            element.src = url;
        });
        URL.revokeObjectURL(url);

        const canvas = canvasRef.current ?? document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const context = canvas.getContext("2d");
        context.drawImage(img, 0, 0);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const previewBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        setPreviewUrl(URL.createObjectURL(previewBlob));

        await runOcrOnImage(imageData.data, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
    };

    const handlePdf = async (arrayBuffer) => {
        const pdf = await loadPdfJsDocument(arrayBuffer);
        const canvas = canvasRef.current ?? document.createElement("canvas");
        await renderPageToCanvas(pdf, 1, canvas, 2);
        const context = canvas.getContext("2d");
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const previewBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        setPreviewUrl(URL.createObjectURL(previewBlob));

        await runOcrOnImage(imageData.data, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
    };

    const handleFile = async (files) => {
        const selected = files[0];
        if (!selected) return;
        setFile(selected);
        setText("");
        const buffer = await readFileAsArrayBuffer(selected);
        if (selected.type === "application/pdf" || selected.name.endsWith(".pdf")) {
            await handlePdf(buffer);
        } else {
            await handleImage(buffer, selected.type || "image/png");
        }
    };

    const exportSearchablePdf = async () => {
        if (!text || !previewUrl) return;
        const response = await fetch(previewUrl);
        const imageBytes = new Uint8Array(await response.arrayBuffer());
        const pdf = await PDFDocument.create();
        const image = await pdf.embedPng(imageBytes);
        const page = pdf.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        page.drawText(text.slice(0, 500), {
            x: 20,
            y: 20,
            size: 1,
            font,
            color: rgb(1, 1, 1),
            opacity: 0.01,
        });
        const bytes = await pdf.save();
        downloadBytes(bytes, `${getBaseName(file?.name ?? "ocr")}-searchable.pdf`, "application/pdf");
    };

    return (
        <DocToolShell
            title="OCR (Optical Character Recognition)"
            description="Recognize text from images or PDF pages using Tesseract.js in a background worker."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".png,.jpg,.jpeg,.pdf,image/*,application/pdf"
                    label="Drop an image or PDF for OCR"
                    onFiles={handleFile}
                    disabled={loading}
                />
                <canvas ref={canvasRef} hidden />

                {previewUrl ? (
                    <div className="doc-tool-canvas-wrap" style={{ marginTop: "1rem" }}>
                        <img src={previewUrl} alt="OCR preview" style={{ maxWidth: "100%" }} />
                    </div>
                ) : null}

                {loading ? <ProgressBar value={progress} label={status || "Running OCR…"} /> : null}

                {text ? (
                    <>
                        <div className="doc-tool-output-header" style={{ marginTop: "1rem" }}>
                            <h2 className="doc-tool-section-title">Recognized text</h2>
                            <div className="doc-tool-controls" style={{ marginBottom: 0 }}>
                                <button
                                    type="button"
                                    className="doc-tool-button cursor-target"
                                    onClick={() => navigator.clipboard.writeText(text)}
                                >
                                    Copy
                                </button>
                                <button
                                    type="button"
                                    className="doc-tool-button cursor-target"
                                    onClick={() => downloadText(text, `${getBaseName(file?.name ?? "ocr")}.txt`)}
                                >
                                    Export TXT
                                </button>
                                <button
                                    type="button"
                                    className="doc-tool-button doc-tool-button--primary cursor-target"
                                    onClick={exportSearchablePdf}
                                >
                                    Export searchable PDF
                                </button>
                            </div>
                        </div>
                        <textarea className="doc-tool-textarea" value={text} readOnly />
                    </>
                ) : null}

                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default Ocr;

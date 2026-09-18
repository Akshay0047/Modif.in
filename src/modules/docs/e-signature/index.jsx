import { useEffect, useRef, useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { downloadBytes } from "../_shared/downloadUtils";
import { readFileAsArrayBuffer, readFileAsDataUrl, replaceExtension } from "../_shared/fileUtils";
import { loadPdfLibDocument } from "../_shared/pdfUtils";

function ESignature() {
    const [pdfFile, setPdfFile] = useState(null);
    const [pageIndex, setPageIndex] = useState(0);
    const [pageCount, setPageCount] = useState(0);
    const [posX, setPosX] = useState(100);
    const [posY, setPosY] = useState(100);
    const [width, setWidth] = useState(180);
    const canvasRef = useRef(null);
    const [drawing, setDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = "#000000";
        context.lineWidth = 2;
        context.lineCap = "round";
    }, []);

    const startDraw = (event) => {
        setDrawing(true);
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const context = canvas.getContext("2d");
        context.beginPath();
        context.moveTo(event.clientX - rect.left, event.clientY - rect.top);
    };

    const draw = (event) => {
        if (!drawing) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const context = canvas.getContext("2d");
        context.lineTo(event.clientX - rect.left, event.clientY - rect.top);
        context.stroke();
        setHasSignature(true);
    };

    const stopDraw = () => setDrawing(false);

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const uploadSignature = async (files) => {
        const file = files[0];
        if (!file) return;
        const dataUrl = await readFileAsDataUrl(file);
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        const img = await new Promise((resolve, reject) => {
            const element = new Image();
            element.onload = () => resolve(element);
            element.onerror = reject;
            element.src = dataUrl;
        });
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasSignature(true);
        URL.revokeObjectURL(dataUrl.startsWith("blob:") ? dataUrl : "");
    };

    const applySignature = async () => {
        if (!pdfFile || !hasSignature) return;
        setLoading(true);
        setError("");
        try {
            const buffer = await readFileAsArrayBuffer(pdfFile);
            const pdf = await loadPdfLibDocument(buffer);
            setPageCount(pdf.getPageCount());
            const signatureCanvas = canvasRef.current;
            const pngData = signatureCanvas.toDataURL("image/png");
            const image = await pdf.embedPng(pngData);
            const page = pdf.getPage(pageIndex);
            page.drawImage(image, {
                x: posX,
                y: posY,
                width,
                height: (image.height / image.width) * width,
            });
            const bytes = await pdf.save();
            downloadBytes(bytes, replaceExtension(pdfFile.name, "-signed.pdf"), "application/pdf");
        } catch (signError) {
            setError(signError instanceof Error ? signError.message : "Failed to apply signature.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DocToolShell
            title="E-Signature"
            description="Draw or upload a signature and embed it onto a PDF page at custom coordinates."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    label="Drop the PDF to sign"
                    onFiles={(files) => {
                        setPdfFile(files[0] ?? null);
                        setPageIndex(0);
                    }}
                    disabled={loading}
                />

                <div className="doc-tool-grid doc-tool-grid--3" style={{ marginTop: "1rem" }}>
                    <div>
                        <label className="doc-tool-label">Page ({pageIndex + 1})</label>
                        <input
                            type="number"
                            className="doc-tool-input cursor-target"
                            min={1}
                            value={pageIndex + 1}
                            onChange={(event) => setPageIndex(Math.max(0, Number(event.target.value) - 1))}
                        />
                    </div>
                    <div>
                        <label className="doc-tool-label">X position</label>
                        <input type="number" className="doc-tool-input cursor-target" value={posX} onChange={(e) => setPosX(Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="doc-tool-label">Y position</label>
                        <input type="number" className="doc-tool-input cursor-target" value={posY} onChange={(e) => setPosY(Number(e.target.value))} />
                    </div>
                </div>

                <label className="doc-tool-label" style={{ marginTop: "1rem" }}>Signature pad</label>
                <div className="doc-tool-canvas-wrap">
                    <canvas
                        ref={canvasRef}
                        width={500}
                        height={160}
                        className="cursor-target"
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={stopDraw}
                        onMouseLeave={stopDraw}
                    />
                </div>

                <div className="doc-tool-controls">
                    <button type="button" className="doc-tool-button cursor-target" onClick={clearSignature}>
                        Clear pad
                    </button>
                    <label className="doc-tool-button cursor-target">
                        Upload image
                        <input type="file" accept="image/png,image/jpeg" hidden onChange={(e) => uploadSignature(e.target.files)} />
                    </label>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={applySignature}
                        disabled={!pdfFile || !hasSignature || loading}
                    >
                        Apply signature
                    </button>
                </div>

                {pageCount ? <p className="doc-tool-status">PDF has {pageCount} pages.</p> : null}
                {loading ? <p className="doc-tool-status">Embedding signature…</p> : null}
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default ESignature;

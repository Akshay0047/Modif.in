import { useRef, useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { loadPdfWithPdfLib } from "../_shared/pdfUtils";

function ESignature() {
    const sigRef = useRef(null);
    const drawing = useRef(false);
    const [file, setFile] = useState(null);
    const [buffer, setBuffer] = useState(null);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState("");

    const handleFile = async (files) => {
        const next = files[0] ?? null;
        setFile(next);
        setBuffer(next ? await readFileAsArrayBuffer(next) : null);
    };

    const startDraw = (event) => {
        drawing.current = true;
        const canvas = sigRef.current;
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
    };

    const draw = (event) => {
        if (!drawing.current) return;
        const canvas = sigRef.current;
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top);
        ctx.stroke();
    };

    const stopDraw = () => {
        drawing.current = false;
    };

    const clearSig = () => {
        const canvas = sigRef.current;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const handleApply = async () => {
        if (!buffer || !file) return;
        setStatus("Embedding signature…");

        try {
            const canvas = sigRef.current;
            const pngData = canvas.toDataURL("image/png");
            const pngBytes = Uint8Array.from(atob(pngData.split(",")[1]), (c) =>
                c.charCodeAt(0),
            );

            const pdf = await loadPdfWithPdfLib(buffer);
            const pngImage = await pdf.embedPng(pngBytes);
            const pages = pdf.getPages();
            const targetPage = pages[page - 1] ?? pages[0];
            const { width, height } = targetPage.getSize();

            targetPage.drawImage(pngImage, {
                x: width * 0.55,
                y: height * 0.1,
                width: 150,
                height: 60,
            });

            const result = await pdf.save();
            downloadBytes(
                result,
                `${getBaseName(file.name)}-signed.pdf`,
                "application/pdf",
            );
            setStatus("Signed PDF downloaded.");
        } catch (error) {
            setStatus(error?.message ?? "Failed to apply signature.");
        }
    };

    return (
        <DocToolShell
            title="E-Signature"
            description="Draw your signature and embed it onto a PDF page."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    files={file ? [file] : []}
                    onFiles={handleFile}
                    label="Drop a PDF file"
                />

                <div style={{ marginTop: "1rem" }}>
                    <label className="doc-tool-label">Draw your signature</label>
                    <canvas
                        ref={sigRef}
                        width={400}
                        height={120}
                        className="doc-tool-canvas-wrap cursor-target"
                        style={{ background: "#fff", borderRadius: "12px" }}
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={stopDraw}
                        onMouseLeave={stopDraw}
                    />
                    <div className="doc-tool-controls" style={{ marginTop: "0.75rem" }}>
                        <button
                            type="button"
                            className="doc-tool-button cursor-target"
                            onClick={clearSig}
                        >
                            Clear
                        </button>
                        <label className="doc-tool-label" style={{ margin: 0 }}>
                            Page:
                        </label>
                        <input
                            className="doc-tool-input cursor-target"
                            type="number"
                            min="1"
                            value={page}
                            onChange={(e) => setPage(Number(e.target.value))}
                            style={{ width: "80px" }}
                        />
                        <button
                            type="button"
                            className="doc-tool-button doc-tool-button--primary cursor-target"
                            onClick={handleApply}
                            disabled={!buffer}
                        >
                            Apply & Download
                        </button>
                    </div>
                </div>

                {status ? <p className="doc-tool-status">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default ESignature;

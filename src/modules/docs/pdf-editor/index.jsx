import { useEffect, useRef, useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { loadPdfWithPdfJs, loadPdfWithPdfLib, renderPageToCanvas, rgb, StandardFonts } from "../_shared/pdfUtils";

function drawAnnotation(ctx, ann) {
    if (ann.type === "text") {
        ctx.fillStyle = ann.color ?? "#eab308";
        ctx.font = `${ann.size ?? 16}px IBM Plex Sans, sans-serif`;
        ctx.fillText(ann.text, ann.x, ann.y);
    } else if (ann.type === "draw") {
        ctx.strokeStyle = ann.color ?? "#eab308";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ann.points.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
    } else if (ann.type === "highlight") {
        ctx.fillStyle = "rgba(234, 179, 8, 0.35)";
        ctx.fillRect(ann.x, ann.y, ann.w, ann.h);
    }
}

function PdfEditor() {
    const canvasRef = useRef(null);
    const [file, setFile] = useState(null);
    const [buffer, setBuffer] = useState(null);
    const [pageNum, setPageNum] = useState(1);
    const [pageCount, setPageCount] = useState(0);
    const [tool, setTool] = useState("text");
    const [textInput, setTextInput] = useState("");
    const [annotations, setAnnotations] = useState([]);
    const [drawing, setDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);
    const [status, setStatus] = useState("");

    useEffect(() => {
        if (!buffer) return undefined;
        let cancelled = false;

        (async () => {
            const pdf = await loadPdfWithPdfJs(buffer);
            if (cancelled) return;
            setPageCount(pdf.numPages);
            const canvas = await renderPageToCanvas(pdf, pageNum, 1.5);
            pdf.destroy();
            if (cancelled) return;

            const display = canvasRef.current;
            if (!display) return;
            display.width = canvas.width;
            display.height = canvas.height;
            const ctx = display.getContext("2d");
            ctx.drawImage(canvas, 0, 0);
            canvas.width = 0;
            canvas.height = 0;

            annotations
                .filter((a) => a.page === pageNum)
                .forEach((ann) => drawAnnotation(ctx, ann));
        })();

        return () => {
            cancelled = true;
        };
    }, [buffer, pageNum, annotations]);

    const handleFile = async (files) => {
        const next = files[0] ?? null;
        setFile(next);
        setAnnotations([]);
        setPageNum(1);
        setBuffer(next ? await readFileAsArrayBuffer(next) : null);
    };

    const handleCanvasClick = (event) => {
        if (tool !== "text" || !textInput) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        setAnnotations((prev) => [
            ...prev,
            {
                type: "text",
                page: pageNum,
                text: textInput,
                x: (event.clientX - rect.left) * scaleX,
                y: (event.clientY - rect.top) * scaleY,
                color: "#eab308",
                size: 16,
            },
        ]);
    };

    const handleMouseDown = (event) => {
        if (tool !== "draw") return;
        setDrawing(true);
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        setCurrentPath([{
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY,
        }]);
    };

    const handleMouseMove = (event) => {
        if (!drawing || tool !== "draw") return;
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        setCurrentPath((prev) => [
            ...prev,
            {
                x: (event.clientX - rect.left) * scaleX,
                y: (event.clientY - rect.top) * scaleY,
            },
        ]);
    };

    const handleMouseUp = () => {
        if (!drawing) return;
        setDrawing(false);
        if (currentPath.length > 1) {
            setAnnotations((prev) => [
                ...prev,
                { type: "draw", page: pageNum, points: currentPath },
            ]);
        }
        setCurrentPath([]);
    };

    const handleSave = async () => {
        if (!buffer || !file) return;
        setStatus("Embedding annotations…");

        try {
            const pdf = await loadPdfWithPdfLib(buffer);
            const font = await pdf.embedFont(StandardFonts.Helvetica);
            const pages = pdf.getPages();

            for (const ann of annotations) {
                const page = pages[ann.page - 1];
                if (!page) continue;
                const { height } = page.getSize();

                if (ann.type === "text") {
                    page.drawText(ann.text, {
                        x: ann.x,
                        y: height - ann.y,
                        size: ann.size ?? 16,
                        font,
                        color: rgb(0.92, 0.7, 0.03),
                    });
                } else if (ann.type === "highlight") {
                    page.drawRectangle({
                        x: ann.x,
                        y: height - ann.y - ann.h,
                        width: ann.w,
                        height: ann.h,
                        color: rgb(0.92, 0.7, 0.03),
                        opacity: 0.35,
                    });
                }
            }

            const result = await pdf.save();
            downloadBytes(result, `${getBaseName(file.name)}-edited.pdf`, "application/pdf");
            setStatus("Edited PDF downloaded.");
        } catch (error) {
            setStatus(error?.message ?? "Save failed.");
        }
    };

    return (
        <DocToolShell
            title="PDF Editor"
            description="Overlay text, freehand drawings, and highlights onto PDF pages."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    files={file ? [file] : []}
                    onFiles={handleFile}
                    label="Drop a PDF file"
                />

                {buffer ? (
                    <>
                        <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                            {["text", "draw", "highlight"].map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    className={`doc-tool-button cursor-target${tool === t ? " is-active" : ""}`}
                                    onClick={() => setTool(t)}
                                >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                            <button
                                type="button"
                                className="doc-tool-button cursor-target"
                                disabled={pageNum <= 1}
                                onClick={() => setPageNum((p) => p - 1)}
                            >
                                Prev
                            </button>
                            <span className="doc-tool-status">
                                Page {pageNum} / {pageCount}
                            </span>
                            <button
                                type="button"
                                className="doc-tool-button cursor-target"
                                disabled={pageNum >= pageCount}
                                onClick={() => setPageNum((p) => p + 1)}
                            >
                                Next
                            </button>
                            <button
                                type="button"
                                className="doc-tool-button doc-tool-button--primary cursor-target"
                                onClick={handleSave}
                            >
                                Save PDF
                            </button>
                        </div>

                        {tool === "text" ? (
                            <input
                                className="doc-tool-input cursor-target"
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                placeholder="Text to place — click on page"
                                style={{ marginTop: "0.75rem" }}
                            />
                        ) : null}

                        <div className="doc-tool-canvas-wrap" style={{ marginTop: "1rem" }}>
                            <canvas
                                ref={canvasRef}
                                onClick={handleCanvasClick}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                className="cursor-target"
                            />
                        </div>
                    </>
                ) : null}

                {status ? <p className="doc-tool-status">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default PdfEditor;

import { useCallback, useEffect, useRef, useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { downloadBytes } from "../_shared/downloadUtils";
import { readFileAsArrayBuffer, replaceExtension } from "../_shared/fileUtils";
import {
    loadPdfJsDocument,
    PDFDocument,
    renderPageToCanvas,
    StandardFonts,
} from "../_shared/pdfUtils";

const TOOLS = ["text", "draw", "highlight", "rectangle"];

function PdfEditor() {
    const [file, setFile] = useState(null);
    const [pdfDoc, setPdfDoc] = useState(null);
    const [sourceBuffer, setSourceBuffer] = useState(null);
    const [pageNum, setPageNum] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [tool, setTool] = useState("draw");
    const [annotations, setAnnotations] = useState([]);
    const [textInput, setTextInput] = useState("Note");
    const [drawing, setDrawing] = useState(false);
    const [start, setStart] = useState(null);
    const canvasRef = useRef(null);
    const [scale] = useState(1.25);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!file) return undefined;
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const buffer = await readFileAsArrayBuffer(file);
                const doc = await loadPdfJsDocument(buffer);
                if (cancelled) return;
                setSourceBuffer(buffer);
                setPdfDoc(doc);
                setTotalPages(doc.numPages);
                setPageNum(1);
                setAnnotations([]);
            } catch (loadError) {
                if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Failed to load PDF.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [file]);

    const redraw = useCallback(async () => {
        if (!pdfDoc || !canvasRef.current) return;
        const canvas = canvasRef.current;
        await renderPageToCanvas(pdfDoc, pageNum, canvas, scale);
        const context = canvas.getContext("2d");
        annotations
            .filter((item) => item.page === pageNum)
            .forEach((item) => {
                if (item.type === "draw") {
                    context.strokeStyle = item.color;
                    context.lineWidth = 2;
                    context.beginPath();
                    item.points.forEach((point, index) => {
                        if (index === 0) context.moveTo(point.x, point.y);
                        else context.lineTo(point.x, point.y);
                    });
                    context.stroke();
                } else if (item.type === "highlight") {
                    context.fillStyle = "rgba(234, 179, 8, 0.35)";
                    context.fillRect(item.x, item.y, item.width, item.height);
                } else if (item.type === "rectangle") {
                    context.strokeStyle = item.color;
                    context.lineWidth = 2;
                    context.strokeRect(item.x, item.y, item.width, item.height);
                } else if (item.type === "text") {
                    context.fillStyle = item.color;
                    context.font = `${item.size}px IBM Plex Sans, sans-serif`;
                    context.fillText(item.text, item.x, item.y);
                }
            });
    }, [annotations, pageNum, pdfDoc, scale]);

    useEffect(() => {
        redraw();
    }, [redraw]);

    const getPoint = (event) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY,
        };
    };

    const handleDown = (event) => {
        const point = getPoint(event);
        if (tool === "text") {
            setAnnotations((current) => [
                ...current,
                { page: pageNum, type: "text", text: textInput, x: point.x, y: point.y, size: 16, color: "#f8fafc" },
            ]);
            return;
        }
        setDrawing(true);
        setStart(point);
        if (tool === "draw") {
            setAnnotations((current) => [
                ...current,
                { page: pageNum, type: "draw", color: "#eab308", points: [point] },
            ]);
        }
    };

    const handleMove = (event) => {
        if (!drawing || tool !== "draw") return;
        const point = getPoint(event);
        setAnnotations((current) => {
            const next = [...current];
            const last = next[next.length - 1];
            if (last?.type === "draw" && last.page === pageNum) {
                last.points.push(point);
            }
            return next;
        });
        redraw();
    };

    const handleUp = (event) => {
        if (!drawing || !start) return;
        const end = getPoint(event);
        if (tool === "highlight" || tool === "rectangle") {
            const shape = {
                page: pageNum,
                type: tool,
                x: Math.min(start.x, end.x),
                y: Math.min(start.y, end.y),
                width: Math.abs(end.x - start.x),
                height: Math.abs(end.y - start.y),
                color: tool === "rectangle" ? "#eab308" : undefined,
            };
            if (shape.width > 2 && shape.height > 2) {
                setAnnotations((current) => [...current, shape]);
            }
        }
        setDrawing(false);
        setStart(null);
    };

    const exportPdf = async () => {
        if (!sourceBuffer || !file || !pdfDoc) return;
        setLoading(true);
        setError("");
        try {
            const output = await PDFDocument.create();
            for (let index = 0; index < totalPages; index += 1) {
                const canvas = document.createElement("canvas");
                await renderPageToCanvas(pdfDoc, index + 1, canvas, scale);
                const context = canvas.getContext("2d");
                annotations
                    .filter((item) => item.page === index + 1)
                    .forEach((item) => {
                        if (item.type === "draw") {
                            context.strokeStyle = item.color;
                            context.lineWidth = 2;
                            context.beginPath();
                            item.points.forEach((point, pointIndex) => {
                                if (pointIndex === 0) context.moveTo(point.x, point.y);
                                else context.lineTo(point.x, point.y);
                            });
                            context.stroke();
                        } else if (item.type === "highlight") {
                            context.fillStyle = "rgba(234, 179, 8, 0.35)";
                            context.fillRect(item.x, item.y, item.width, item.height);
                        } else if (item.type === "rectangle") {
                            context.strokeStyle = item.color;
                            context.lineWidth = 2;
                            context.strokeRect(item.x, item.y, item.width, item.height);
                        } else if (item.type === "text") {
                            context.fillStyle = item.color;
                            context.font = `${item.size}px sans-serif`;
                            context.fillText(item.text, item.x, item.y);
                        }
                    });

                const pngData = canvas.toDataURL("image/png");
                const image = await output.embedPng(pngData);
                const page = output.addPage([canvas.width, canvas.height]);
                page.drawImage(image, { x: 0, y: 0, width: canvas.width, height: canvas.height });
                canvas.width = 0;
                canvas.height = 0;
            }

            const font = await output.embedFont(StandardFonts.Helvetica);
            void font;
            const bytes = await output.save();
            downloadBytes(bytes, replaceExtension(file.name, "-edited.pdf"), "application/pdf");
        } catch (exportError) {
            setError(exportError instanceof Error ? exportError.message : "Export failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DocToolShell
            title="PDF Editor"
            description="Overlay text, freehand drawings, highlights, and shapes onto PDF pages."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    label="Drop a PDF to edit"
                    onFiles={(files) => setFile(files[0] ?? null)}
                    disabled={loading}
                />

                {pdfDoc ? (
                    <>
                        <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                            {TOOLS.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    className={`doc-tool-button cursor-target${tool === option ? " is-active" : ""}`}
                                    onClick={() => setTool(option)}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                        {tool === "text" ? (
                            <input
                                className="doc-tool-input cursor-target"
                                value={textInput}
                                onChange={(event) => setTextInput(event.target.value)}
                                placeholder="Text to place"
                            />
                        ) : null}
                        <div className="doc-tool-controls">
                            <button type="button" className="doc-tool-button cursor-target" onClick={() => setPageNum((p) => Math.max(1, p - 1))} disabled={pageNum <= 1}>
                                Previous
                            </button>
                            <span className="doc-tool-status">Page {pageNum} / {totalPages}</span>
                            <button type="button" className="doc-tool-button cursor-target" onClick={() => setPageNum((p) => Math.min(totalPages, p + 1))} disabled={pageNum >= totalPages}>
                                Next
                            </button>
                            <button type="button" className="doc-tool-button doc-tool-button--primary cursor-target" onClick={exportPdf} disabled={loading}>
                                Export PDF
                            </button>
                        </div>
                        <div className="doc-tool-canvas-wrap">
                            <canvas
                                ref={canvasRef}
                                className="cursor-target"
                                onMouseDown={handleDown}
                                onMouseMove={handleMove}
                                onMouseUp={handleUp}
                            />
                        </div>
                    </>
                ) : null}

                {loading ? <p className="doc-tool-status">Processing…</p> : null}
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default PdfEditor;

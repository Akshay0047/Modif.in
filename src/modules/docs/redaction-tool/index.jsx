import { useEffect, useRef, useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { downloadBytes } from "../_shared/downloadUtils";
import { readFileAsArrayBuffer, replaceExtension } from "../_shared/fileUtils";
import { loadPdfJsDocument, renderPageToCanvas } from "../_shared/pdfUtils";

function RedactionTool() {
    const [file, setFile] = useState(null);
    const [pdfDoc, setPdfDoc] = useState(null);
    const [sourceBuffer, setSourceBuffer] = useState(null);
    const [pageNum, setPageNum] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [boxes, setBoxes] = useState([]);
    const [drawing, setDrawing] = useState(false);
    const [start, setStart] = useState(null);
    const canvasRef = useRef(null);
    const [scale] = useState(1.5);
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
                setBoxes([]);
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

    useEffect(() => {
        if (!pdfDoc || !canvasRef.current) return undefined;
        let cancelled = false;
        const canvas = canvasRef.current;

        (async () => {
            await renderPageToCanvas(pdfDoc, pageNum, canvas, scale);
            if (cancelled) return;
            const context = canvas.getContext("2d");
            boxes
                .filter((box) => box.page === pageNum)
                .forEach((box) => {
                    context.fillStyle = "#000000";
                    context.fillRect(box.x, box.y, box.width, box.height);
                });
        })();

        return () => {
            cancelled = true;
        };
    }, [pdfDoc, pageNum, scale, boxes]);

    const getCanvasPoint = (event) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY,
        };
    };

    const handlePointerDown = (event) => {
        setDrawing(true);
        setStart(getCanvasPoint(event));
    };

    const handlePointerUp = (event) => {
        if (!drawing || !start) return;
        const end = getCanvasPoint(event);
        const box = {
            page: pageNum,
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
            width: Math.abs(end.x - start.x),
            height: Math.abs(end.y - start.y),
        };
        if (box.width > 4 && box.height > 4) {
            setBoxes((current) => [...current, box]);
        }
        setDrawing(false);
        setStart(null);
    };

    const applyRedactions = async () => {
        if (!sourceBuffer || !file || !pdfDoc) return;
        setLoading(true);
        setError("");
        try {
            const newPdf = await import("pdf-lib").then((m) => m.PDFDocument.create());

            for (let index = 0; index < totalPages; index += 1) {
                const canvas = document.createElement("canvas");
                await renderPageToCanvas(pdfDoc, index + 1, canvas, scale);
                const context = canvas.getContext("2d");
                boxes
                    .filter((box) => box.page === index + 1)
                    .forEach((box) => {
                        context.fillStyle = "#000000";
                        context.fillRect(box.x, box.y, box.width, box.height);
                    });
                const pngData = canvas.toDataURL("image/png");
                const image = await newPdf.embedPng(pngData);
                const page = newPdf.addPage([canvas.width, canvas.height]);
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: canvas.width,
                    height: canvas.height,
                });
                canvas.width = 0;
                canvas.height = 0;
            }

            const bytes = await newPdf.save();
            downloadBytes(bytes, replaceExtension(file.name, "-redacted.pdf"), "application/pdf");
        } catch (redactError) {
            setError(redactError instanceof Error ? redactError.message : "Redaction failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DocToolShell
            title="Redaction Tool"
            description="Draw permanent black redaction boxes over sensitive content. Redacted regions are rasterized to prevent recovery."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    label="Drop a PDF to redact"
                    onFiles={(files) => setFile(files[0] ?? null)}
                    disabled={loading}
                />

                {pdfDoc ? (
                    <>
                        <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                            <button
                                type="button"
                                className="doc-tool-button cursor-target"
                                onClick={() => setPageNum((current) => Math.max(1, current - 1))}
                                disabled={pageNum <= 1}
                            >
                                Previous page
                            </button>
                            <span className="doc-tool-status">Page {pageNum} of {totalPages}</span>
                            <button
                                type="button"
                                className="doc-tool-button cursor-target"
                                onClick={() => setPageNum((current) => Math.min(totalPages, current + 1))}
                                disabled={pageNum >= totalPages}
                            >
                                Next page
                            </button>
                            <button
                                type="button"
                                className="doc-tool-button doc-tool-button--primary cursor-target"
                                onClick={applyRedactions}
                                disabled={loading || !boxes.length}
                            >
                                Apply redactions
                            </button>
                        </div>
                        <div className="doc-tool-canvas-wrap">
                            <canvas
                                ref={canvasRef}
                                className="cursor-target"
                                onMouseDown={handlePointerDown}
                                onMouseUp={handlePointerUp}
                            />
                        </div>
                        <p className="doc-tool-status">Click and drag to draw redaction boxes on the current page.</p>
                    </>
                ) : null}

                {loading ? <p className="doc-tool-status">Processing…</p> : null}
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default RedactionTool;

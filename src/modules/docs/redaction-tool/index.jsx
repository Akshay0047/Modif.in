import { useEffect, useRef, useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { clonePdfBytes, loadPdfWithPdfJs, loadPdfWithPdfLib, PDFDocument, renderPageToCanvas } from "../_shared/pdfUtils";
import { scaleCanvasRect } from "../_shared/redactionGeometry";

function RedactionTool() {
    const canvasRef = useRef(null);
    const [file, setFile] = useState(null);
    const [buffer, setBuffer] = useState(null);
    const [pageNum, setPageNum] = useState(1);
    const [pageCount, setPageCount] = useState(0);
    const [boxes, setBoxes] = useState([]);
    const [drawing, setDrawing] = useState(false);
    const [start, setStart] = useState(null);
    const [current, setCurrent] = useState(null);
    const [status, setStatus] = useState("");

    useEffect(() => {
        if (!buffer) return undefined;
        let cancelled = false;

        (async () => {
            try {
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

                boxes
                    .filter((b) => b.page === pageNum)
                    .forEach((box) => {
                        ctx.fillStyle = "#000";
                        ctx.fillRect(box.x, box.y, box.w, box.h);
                    });

                if (current && start) {
                    ctx.fillStyle = "rgba(0,0,0,0.5)";
                    ctx.fillRect(
                        Math.min(start.x, current.x),
                        Math.min(start.y, current.y),
                        Math.abs(current.x - start.x),
                        Math.abs(current.y - start.y),
                    );
                }
            } catch (error) {
                if (cancelled) return;
                setPageCount(0);
                setBoxes([]);
                setStatus(error?.message || "Could not read this PDF. Choose another file.");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [buffer, pageNum, boxes, start, current]);

    const handleFile = async (files) => {
        const next = files[0] ?? null;
        setFile(next);
        setBoxes([]);
        setPageNum(1);
        setStatus("");
        if (!next) {
            setBuffer(null);
            setPageCount(0);
            return;
        }
        try {
            const bytes = clonePdfBytes(await readFileAsArrayBuffer(next));
            const pdf = await loadPdfWithPdfJs(bytes);
            pdf.destroy();
            setBuffer(bytes);
        } catch (error) {
            setBuffer(null);
            setPageCount(0);
            setStatus(error?.message || "Could not read this PDF. Choose another file.");
        }
    };

    const getCoords = (event) => {
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
        if (event.button != null && event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const point = getCoords(event);
        setDrawing(true);
        setStart(point);
        setCurrent(point);
    };

    const handlePointerMove = (event) => {
        if (!drawing) return;
        setCurrent(getCoords(event));
    };

    const handlePointerUp = (event) => {
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        if (!drawing || !start || !current) return;
        setDrawing(false);
        const canvas = canvasRef.current;
        const box = {
            page: pageNum,
            x: Math.min(start.x, current.x),
            y: Math.min(start.y, current.y),
            w: Math.abs(current.x - start.x),
            h: Math.abs(current.y - start.y),
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
        };
        if (box.w > 5 && box.h > 5) {
            setBoxes((prev) => [...prev, box]);
        }
        setStart(null);
        setCurrent(null);
    };

    const handleApply = async () => {
        if (!buffer || !file || boxes.length === 0) return;
        setStatus("Applying permanent redactions…");

        try {
            const source = await loadPdfWithPdfLib(buffer);
            const preview = await loadPdfWithPdfJs(buffer);
            const output = await PDFDocument.create();

            for (let index = 0; index < source.getPageCount(); index += 1) {
                const pageBoxes = boxes.filter((box) => box.page === index + 1);
                if (pageBoxes.length === 0) {
                    const [copied] = await output.copyPages(source, [index]);
                    output.addPage(copied);
                    continue;
                }

                const canvas = await renderPageToCanvas(preview, index + 1, 2);
                const context = canvas.getContext("2d");
                context.fillStyle = "#000";
                pageBoxes.forEach((box) => {
                    const scaled = scaleCanvasRect(
                        box,
                        { width: box.canvasWidth, height: box.canvasHeight },
                        { width: canvas.width, height: canvas.height },
                    );
                    context.fillRect(scaled.x, scaled.y, scaled.w, scaled.h);
                });

                const png = await new Promise((resolve, reject) => {
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error("Could not rasterize the redacted page."));
                    }, "image/png");
                });
                const { width, height } = source.getPage(index).getSize();
                const image = await output.embedPng(new Uint8Array(await png.arrayBuffer()));
                const page = output.addPage([width, height]);
                page.drawImage(image, { x: 0, y: 0, width, height });
                canvas.width = 0;
                canvas.height = 0;
            }

            preview.destroy();
            const result = await output.save();
            downloadBytes(
                result,
                `${getBaseName(file.name)}-redacted.pdf`,
                "application/pdf",
            );
            setStatus("Redacted PDF downloaded. Covered pages are flattened to an image, so text and images under the black boxes cannot be extracted.");
        } catch (error) {
            setStatus(error?.message ?? "Redaction failed.");
        }
    };

    return (
        <DocToolShell
            title="Redaction Tool"
            description="Draw boxes over sensitive content. Covered pages are saved as images so the hidden text and pictures cannot be recovered from the download."
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
                            <button
                                type="button"
                                className="doc-tool-button cursor-target"
                                disabled={pageNum <= 1}
                                onClick={() => setPageNum((p) => p - 1)}
                            >
                                Prev
                            </button>
                            <span className="doc-tool-status">Page {pageNum} / {pageCount}</span>
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
                                onClick={handleApply}
                                disabled={boxes.length === 0}
                            >
                                Apply Redactions ({boxes.length})
                            </button>
                        </div>

                        <p className="doc-tool-status">Drag with a mouse, finger, or stylus to draw redaction boxes. The rest of the page still scrolls.</p>

                        <div className="doc-tool-canvas-wrap" style={{ marginTop: "0.5rem" }}>
                            <canvas
                                ref={canvasRef}
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                onPointerCancel={handlePointerUp}
                                className="cursor-target"
                                style={{ touchAction: "none", maxWidth: "100%" }}
                            />
                        </div>
                    </>
                ) : null}

                {status ? <p className="doc-tool-status doc-tool-status--success">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default RedactionTool;

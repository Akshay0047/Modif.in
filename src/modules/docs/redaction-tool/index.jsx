import { useEffect, useRef, useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { loadPdfWithPdfJs, loadPdfWithPdfLib, renderPageToCanvas, rgb } from "../_shared/pdfUtils";

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
        setBuffer(next ? await readFileAsArrayBuffer(next) : null);
    };

    const getCoords = (event) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY,
        };
    };

    const handleMouseDown = (event) => {
        setDrawing(true);
        setStart(getCoords(event));
        setCurrent(getCoords(event));
    };

    const handleMouseMove = (event) => {
        if (!drawing) return;
        setCurrent(getCoords(event));
    };

    const handleMouseUp = () => {
        if (!drawing || !start || !current) return;
        setDrawing(false);
        const box = {
            page: pageNum,
            x: Math.min(start.x, current.x),
            y: Math.min(start.y, current.y),
            w: Math.abs(current.x - start.x),
            h: Math.abs(current.y - start.y),
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
            const pdf = await loadPdfWithPdfLib(buffer);
            const pages = pdf.getPages();

            for (const box of boxes) {
                const page = pages[box.page - 1];
                if (!page) continue;
                const { height } = page.getSize();
                page.drawRectangle({
                    x: box.x,
                    y: height - box.y - box.h,
                    width: box.w,
                    height: box.h,
                    color: rgb(0, 0, 0),
                });
            }

            const result = await pdf.save();
            downloadBytes(
                result,
                `${getBaseName(file.name)}-redacted.pdf`,
                "application/pdf",
            );
            setStatus("Redacted PDF downloaded. Content under black boxes is permanently covered.");
        } catch (error) {
            setStatus(error?.message ?? "Redaction failed.");
        }
    };

    return (
        <DocToolShell
            title="Redaction Tool"
            description="Draw redaction boxes over sensitive content to permanently cover it with solid black."
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

                        <p className="doc-tool-status">Click and drag to draw redaction boxes</p>

                        <div className="doc-tool-canvas-wrap" style={{ marginTop: "0.5rem" }}>
                            <canvas
                                ref={canvasRef}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                className="cursor-target"
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

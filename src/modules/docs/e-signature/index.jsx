import { useEffect, useRef, useState } from "react";
import { degrees } from "pdf-lib";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { readFileAsDataUrl } from "../_shared/fileUtils";
import {
    clonePdfBytes,
    loadPdfWithPdfJs,
    loadPdfWithPdfLib,
    renderPageToDataUrl,
} from "../_shared/pdfUtils";

function ESignature() {
    const sigRef = useRef(null);
    const drawing = useRef(false);
    const pageWrapRef = useRef(null);
    const [file, setFile] = useState(null);
    const [buffer, setBuffer] = useState(null);
    const [page, setPage] = useState(1);
    const [pageCount, setPageCount] = useState(1);
    const [pageImage, setPageImage] = useState("");
    const [status, setStatus] = useState("");
    const [stampSrc, setStampSrc] = useState("");
    const [stamp, setStamp] = useState({ x: 48, y: 48, w: 180, h: 72, rotation: 0 });
    const dragRef = useRef(null);

    const handleFile = async (files) => {
        const next = files[0] ?? null;
        setFile(next);
        if (!next) {
            setBuffer(null);
            setPageImage("");
            return;
        }
        const bytes = clonePdfBytes(await readFileAsArrayBuffer(next));
        setBuffer(bytes);
        const pdf = await loadPdfWithPdfJs(bytes);
        setPageCount(pdf.numPages);
        setPage(1);
        setPageImage(await renderPageToDataUrl(pdf, 1, 1.35));
        pdf.destroy();
    };

    useEffect(() => {
        if (!buffer) return undefined;
        let cancelled = false;
        (async () => {
            const pdf = await loadPdfWithPdfJs(buffer);
            if (cancelled) return;
            const image = await renderPageToDataUrl(pdf, page, 1.35);
            pdf.destroy();
            if (!cancelled) setPageImage(image);
        })();
        return () => {
            cancelled = true;
        };
    }, [buffer, page]);

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
        setStampSrc("");
    };

    const useDrawnSignature = () => {
        const canvas = sigRef.current;
        setStampSrc(canvas.toDataURL("image/png"));
        setStamp({ x: 48, y: 48, w: 180, h: 72, rotation: 0 });
    };

    const handlePicture = async (event) => {
        const next = event.target.files?.[0];
        event.target.value = "";
        if (!next) return;
        const dataUrl = await readFileAsDataUrl(next);
        setStampSrc(dataUrl);
        setStamp({ x: 48, y: 48, w: 180, h: 80, rotation: 0 });
    };

    const onStampPointerDown = (event, mode) => {
        event.preventDefault();
        event.stopPropagation();
        const wrap = pageWrapRef.current.getBoundingClientRect();
        dragRef.current = {
            mode,
            startX: event.clientX,
            startY: event.clientY,
            orig: { ...stamp },
            wrap,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const onStampPointerMove = (event) => {
        const drag = dragRef.current;
        if (!drag) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (drag.mode === "move") {
            setStamp({
                ...drag.orig,
                x: Math.max(0, drag.orig.x + dx),
                y: Math.max(0, drag.orig.y + dy),
            });
        } else if (drag.mode === "resize") {
            setStamp({
                ...drag.orig,
                w: Math.max(40, drag.orig.w + dx),
                h: Math.max(24, drag.orig.h + dy),
            });
        } else if (drag.mode === "rotate") {
            const originX = drag.wrap.left + drag.orig.x + drag.orig.w / 2;
            const originY = drag.wrap.top + drag.orig.y + drag.orig.h / 2;
            const angle = (Math.atan2(event.clientY - originY, event.clientX - originX) * 180) / Math.PI;
            setStamp({ ...drag.orig, rotation: Math.round(angle) });
        }
    };

    const onStampPointerUp = () => {
        dragRef.current = null;
    };

    const handleApply = async () => {
        if (!buffer || !file || !stampSrc) return;
        setStatus("Embedding signature…");

        try {
            const pngBytes = Uint8Array.from(atob(stampSrc.split(",")[1]), (c) => c.charCodeAt(0));
            const pdf = await loadPdfWithPdfLib(buffer);
            const pngImage = stampSrc.includes("image/jpeg")
                ? await pdf.embedJpg(pngBytes)
                : await pdf.embedPng(pngBytes);
            const pages = pdf.getPages();
            const targetPage = pages[page - 1] ?? pages[0];
            const { width, height } = targetPage.getSize();
            const wrap = pageWrapRef.current;
            const scaleX = width / wrap.clientWidth;
            const scaleY = height / wrap.clientHeight;

            targetPage.drawImage(pngImage, {
                x: stamp.x * scaleX,
                y: height - (stamp.y + stamp.h) * scaleY,
                width: stamp.w * scaleX,
                height: stamp.h * scaleY,
                rotate: degrees(stamp.rotation ?? 0),
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
            description="Draw a signature or place a picture from your device, then position it on a PDF page."
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
                        <button type="button" className="doc-tool-button cursor-target" onClick={clearSig}>
                            Clear
                        </button>
                        <button type="button" className="doc-tool-button cursor-target" onClick={useDrawnSignature}>
                            Use drawn signature
                        </button>
                        <label className="doc-tool-button cursor-target" style={{ display: "inline-flex", alignItems: "center" }}>
                            Select picture from device
                            <input type="file" accept="image/*" hidden onChange={handlePicture} />
                        </label>
                        <label className="doc-tool-label" style={{ margin: 0 }}>
                            Page:
                        </label>
                        <input
                            className="doc-tool-input cursor-target"
                            type="number"
                            min="1"
                            max={pageCount}
                            value={page}
                            onChange={(e) => setPage(Math.max(1, Math.min(pageCount, Number(e.target.value) || 1)))}
                            style={{ width: "80px" }}
                        />
                        <button
                            type="button"
                            className="doc-tool-button doc-tool-button--primary cursor-target"
                            onClick={handleApply}
                            disabled={!buffer || !stampSrc}
                        >
                            Apply & Download
                        </button>
                    </div>
                </div>

                {status ? <p className="doc-tool-status">{status}</p> : null}
            </div>

            {pageImage ? (
                <div className="doc-tool-panel">
                    <h2 className="doc-tool-section-title">Place signature on page {page}</h2>
                    <div
                        ref={pageWrapRef}
                        className="doc-tool-stamp-layer"
                        onPointerMove={onStampPointerMove}
                        onPointerUp={onStampPointerUp}
                    >
                        <img src={pageImage} alt={`Page ${page}`} style={{ display: "block", width: "100%", height: "auto" }} />
                        {stampSrc ? (
                            <div
                                className="doc-tool-stamp"
                                style={{
                                    left: stamp.x,
                                    top: stamp.y,
                                    width: stamp.w,
                                    height: stamp.h,
                                    transform: `rotate(${stamp.rotation}deg)`,
                                }}
                                onPointerDown={(event) => onStampPointerDown(event, "move")}
                            >
                                <img src={stampSrc} alt="Signature" />
                                <span
                                    className="doc-tool-stamp__handle doc-tool-stamp__handle--se"
                                    onPointerDown={(event) => onStampPointerDown(event, "resize")}
                                />
                                <span
                                    className="doc-tool-stamp__handle doc-tool-stamp__handle--rotate"
                                    onPointerDown={(event) => onStampPointerDown(event, "rotate")}
                                />
                            </div>
                        ) : (
                            <p className="doc-tool-empty" style={{ position: "absolute", left: 12, top: 12 }}>
                                Draw a signature or select a picture, then drag it onto this page.
                            </p>
                        )}
                    </div>
                </div>
            ) : null}
        </DocToolShell>
    );
}

export default ESignature;

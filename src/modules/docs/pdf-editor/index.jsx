import { useCallback, useEffect, useRef, useState } from "react";
import { LineCapStyle } from "pdf-lib";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { readFileAsDataUrl } from "../_shared/fileUtils";
import {
    clonePdfBytes,
    degrees,
    extractPdfPageImages,
    loadPdfWithPdfJs,
    loadPdfWithPdfLib,
    renderPageToCanvas,
    rgb,
    StandardFonts,
} from "../_shared/pdfUtils";
import { pageScale } from "./pageScale";

const FONTS = [
    { id: "Helvetica", label: "Helvetica", css: "IBM Plex Sans, sans-serif", embed: StandardFonts.Helvetica },
    { id: "Times-Roman", label: "Times", css: "Times New Roman, serif", embed: StandardFonts.TimesRoman },
    { id: "Courier", label: "Courier", css: "Courier New, monospace", embed: StandardFonts.Courier },
    { id: "Helvetica-Bold", label: "Helvetica Bold", css: "IBM Plex Sans, sans-serif", embed: StandardFonts.HelveticaBold },
];

const BRUSHES = [
    { id: "pen", label: "Pen" },
    { id: "marker", label: "Marker" },
    { id: "pencil", label: "Pencil" },
];

const DRAW_COLORS = ["#eab308", "#ef4444", "#22c55e", "#3b82f6", "#111827", "#f8fafc"];
const HIGHLIGHT_COLORS = ["#facc15", "#4ade80", "#f472b6", "#38bdf8", "#fb923c"];

function nextId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function hexToRgbColor(hex, fallback = rgb(0.92, 0.7, 0.03)) {
    const value = String(hex ?? "").replace("#", "");
    if (value.length !== 6) return fallback;
    const int = Number.parseInt(value, 16);
    if (Number.isNaN(int)) return fallback;
    return rgb(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255);
}

function withAlpha(hex, alpha) {
    const value = String(hex ?? "").replace("#", "");
    const int = Number.parseInt(value, 16);
    if (Number.isNaN(int)) return `rgba(234, 179, 8, ${alpha})`;
    return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
}

function getPoint(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
}

function fontCss(fontId) {
    return FONTS.find((font) => font.id === fontId)?.css ?? FONTS[0].css;
}

function hitTest(ann, point) {
    if (ann.type === "text") {
        const width = Math.max(ann.w ?? 80, (ann.text?.length ?? 1) * (ann.size ?? 16) * 0.55);
        const height = (ann.size ?? 16) * 1.4;
        return point.x >= ann.x && point.x <= ann.x + width && point.y >= ann.y - height && point.y <= ann.y + 8;
    }
    if (ann.type === "highlight" || ann.type === "image") {
        return point.x >= ann.x && point.x <= ann.x + ann.w && point.y >= ann.y && point.y <= ann.y + ann.h;
    }
    return false;
}

function handleHit(ann, point) {
    const box = boundsOf(ann);
    if (!box) return "";
    if (Math.abs(point.x - (box.x + box.w)) < 10 && Math.abs(point.y - (box.y + box.h)) < 10) {
        return "se";
    }
    return "";
}

function boundsOf(ann) {
    if (ann.type === "text") {
        return {
            x: ann.x,
            y: ann.y - (ann.size ?? 16),
            w: Math.max(ann.w ?? 80, (ann.text?.length ?? 1) * (ann.size ?? 16) * 0.55),
            h: (ann.size ?? 16) * 1.4,
        };
    }
    if (ann.type === "highlight" || ann.type === "image") {
        return { x: ann.x, y: ann.y, w: ann.w, h: ann.h };
    }
    return null;
}

function drawAnnotation(ctx, ann, selected) {
    if (ann.type === "text") {
        ctx.fillStyle = ann.color ?? "#eab308";
        ctx.font = `${ann.fontId === "Helvetica-Bold" ? "700 " : ""}${ann.size ?? 16}px ${fontCss(ann.fontId)}`;
        ctx.textBaseline = "alphabetic";
        ctx.fillText(ann.text, ann.x, ann.y);
    } else if (ann.type === "draw") {
        ctx.strokeStyle = withAlpha(ann.color ?? "#eab308", ann.opacity ?? 1);
        ctx.lineWidth = ann.size ?? 2;
        ctx.lineCap = ann.brush === "marker" ? "square" : "round";
        ctx.lineJoin = ann.brush === "marker" ? "bevel" : "round";
        ctx.beginPath();
        ann.points.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
    } else if (ann.type === "highlight") {
        ctx.fillStyle = withAlpha(ann.color ?? "#facc15", 0.4);
        ctx.fillRect(ann.x, ann.y, ann.w, ann.h);
    } else if (ann.type === "image" && ann.imageEl) {
        ctx.save();
        ctx.translate(ann.x + ann.w / 2, ann.y + ann.h / 2);
        ctx.rotate(((ann.rotation ?? 0) * Math.PI) / 180);
        ctx.drawImage(ann.imageEl, -ann.w / 2, -ann.h / 2, ann.w, ann.h);
        ctx.restore();
    }

    if (selected) {
        const box = boundsOf(ann);
        if (box) {
            ctx.strokeStyle = "#eab308";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(box.x, box.y, box.w, box.h);
            ctx.setLineDash([]);
            ctx.fillStyle = "#eab308";
            ctx.fillRect(box.x + box.w - 5, box.y + box.h - 5, 10, 10);
        }
    }
}

function PdfEditor() {
    const canvasRef = useRef(null);
    const pdfRef = useRef(null);
    const baseCanvasRef = useRef(null);
    const pageSizesRef = useRef({});
    const imageCacheRef = useRef(new Map());
    const interactionRef = useRef(null);
    const fileInputRef = useRef(null);

    const [file, setFile] = useState(null);
    const [buffer, setBuffer] = useState(null);
    const [pageNum, setPageNum] = useState(1);
    const [pageCount, setPageCount] = useState(0);
    const [pageReady, setPageReady] = useState(false);
    const [documentVersion, setDocumentVersion] = useState(0);
    const [tool, setTool] = useState("text");
    const [textInput, setTextInput] = useState("Sample text");
    const [fontId, setFontId] = useState("Helvetica");
    const [fontSize, setFontSize] = useState(18);
    const [textColor, setTextColor] = useState("#eab308");
    const [brush, setBrush] = useState("pen");
    const [drawColor, setDrawColor] = useState("#eab308");
    const [drawSize, setDrawSize] = useState(3);
    const [drawOpacity, setDrawOpacity] = useState(1);
    const [highlightColor, setHighlightColor] = useState("#facc15");
    const [annotations, setAnnotations] = useState([]);
    const [selectedId, setSelectedId] = useState("");
    const [pageImages, setPageImages] = useState([]);
    const [status, setStatus] = useState("");
    const [live, setLive] = useState(null);
    const [sidebar, setSidebar] = useState("picture");
    const [pageVersion, setPageVersion] = useState(0);

    const paint = useCallback(() => {
        const display = canvasRef.current;
        const base = baseCanvasRef.current;
        if (!display || !base) return;
        display.width = base.width;
        display.height = base.height;
        const ctx = display.getContext("2d");
        ctx.drawImage(base, 0, 0);
        annotations
            .filter((ann) => ann.page === pageNum)
            .forEach((ann) => {
                const withImage = ann.type === "image"
                    ? { ...ann, imageEl: imageCacheRef.current.get(ann.id) }
                    : ann;
                drawAnnotation(ctx, withImage, ann.id === selectedId);
            });
        if (live?.type === "draw" && live.points?.length) {
            drawAnnotation(ctx, live, false);
        }
        if (live?.type === "highlight") {
            drawAnnotation(ctx, live, false);
        }
    }, [annotations, live, pageNum, selectedId]);

    useEffect(() => {
        paint();
    }, [paint, pageVersion]);

    useEffect(() => {
        if (!pdfRef.current) return undefined;
        let cancelled = false;
        setPageReady(false);
        setStatus("Loading page preview…");
        (async () => {
            try {
                const canvas = await renderPageToCanvas(pdfRef.current, pageNum, 1.5);
                if (cancelled) return;
                pageSizesRef.current[pageNum] = { width: canvas.width, height: canvas.height };
                baseCanvasRef.current = canvas;
                const images = await extractPdfPageImages(pdfRef.current, pageNum);
                if (cancelled) return;
                setPageImages(images);
                setPageVersion((value) => value + 1);
                setPageReady(true);
                setStatus("");
            } catch (error) {
                if (cancelled) return;
                setPageReady(false);
                setStatus(error?.message || "Could not render this page.");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [pageNum, buffer, documentVersion]);

    const handleFile = async (files) => {
        const next = files[0] ?? null;
        setFile(next);
        setAnnotations([]);
        setSelectedId("");
        setPageNum(1);
        setLive(null);
        setPageReady(false);
        pageSizesRef.current = {};
        if (pdfRef.current) {
            pdfRef.current.destroy();
            pdfRef.current = null;
        }
        if (!next) {
            setBuffer(null);
            setPageCount(0);
            setDocumentVersion(0);
            return;
        }
        try {
            const bytes = clonePdfBytes(await readFileAsArrayBuffer(next));
            setBuffer(bytes);
            const pdf = await loadPdfWithPdfJs(bytes);
            pdfRef.current = pdf;
            setPageCount(pdf.numPages);
            setDocumentVersion((value) => value + 1);
        } catch (error) {
            setBuffer(null);
            setPageCount(0);
            setPageReady(false);
            setStatus(error?.message || "Could not read this PDF. Choose another file.");
        }
    };

    const updateSelected = (patch) => {
        setAnnotations((prev) => prev.map((ann) => (ann.id === selectedId ? { ...ann, ...patch } : ann)));
    };

    const handlePointerDown = (event) => {
        const canvas = canvasRef.current;
        if (!canvas || !pageReady) return;
        try {
            canvas.setPointerCapture(event.pointerId);
        } catch {
            // Synthetic events and some browsers may reject capture.
        }
        const point = getPoint(event, canvas);
        const pageAnns = annotations.filter((ann) => ann.page === pageNum);

        if (tool === "text" || tool === "picture") {
            const selected = pageAnns.find((ann) => ann.id === selectedId);
            if (selected && handleHit(selected, point) === "se") {
                interactionRef.current = { mode: "resize", id: selected.id, start: point, orig: { ...selected } };
                return;
            }
            const hit = [...pageAnns].reverse().find((ann) => hitTest(ann, point));
            if (hit) {
                setSelectedId(hit.id);
                interactionRef.current = { mode: "move", id: hit.id, start: point, orig: { ...hit } };
                return;
            }
        }

        if (tool === "draw") {
            setSelectedId("");
            const next = {
                type: "draw",
                page: pageNum,
                points: [point],
                color: drawColor,
                size: brush === "marker" ? drawSize * 2 : drawSize,
                opacity: brush === "pencil" ? Math.min(drawOpacity, 0.55) : drawOpacity,
                brush,
            };
            interactionRef.current = { mode: "draw", annotation: next };
            setLive(next);
            return;
        }

        if (tool === "highlight") {
            setSelectedId("");
            const next = {
                type: "highlight",
                page: pageNum,
                x: point.x,
                y: point.y,
                w: 0,
                h: 0,
                color: highlightColor,
            };
            interactionRef.current = { mode: "highlight", start: point, annotation: next };
            setLive(next);
            return;
        }

        interactionRef.current = { mode: "text", start: point, moved: false };
    };

    const handlePointerMove = (event) => {
        const interaction = interactionRef.current;
        const canvas = canvasRef.current;
        if (!interaction || !canvas) return;
        const point = getPoint(event, canvas);

        if (interaction.mode === "draw") {
            interaction.annotation.points.push(point);
            setLive({ ...interaction.annotation, points: [...interaction.annotation.points] });
            return;
        }
        if (interaction.mode === "highlight") {
            const { start } = interaction;
            const next = {
                type: "highlight",
                page: pageNum,
                x: Math.min(start.x, point.x),
                y: Math.min(start.y, point.y),
                w: Math.abs(point.x - start.x),
                h: Math.abs(point.y - start.y),
                color: highlightColor,
            };
            interaction.annotation = next;
            setLive(next);
            return;
        }
        if (interaction.mode === "move") {
            const dx = point.x - interaction.start.x;
            const dy = point.y - interaction.start.y;
            setAnnotations((prev) => prev.map((ann) => {
                if (ann.id !== interaction.id) return ann;
                if (ann.type === "draw") {
                    return {
                        ...ann,
                        points: interaction.orig.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
                    };
                }
                return { ...ann, x: interaction.orig.x + dx, y: interaction.orig.y + dy };
            }));
            return;
        }
        if (interaction.mode === "resize") {
            const orig = interaction.orig;
            const w = Math.max(20, (orig.w ?? 80) + (point.x - interaction.start.x));
            const h = Math.max(16, (orig.h ?? orig.size ?? 16) + (point.y - interaction.start.y));
            setAnnotations((prev) => prev.map((ann) => {
                if (ann.id !== interaction.id) return ann;
                if (ann.type === "text") {
                    return { ...ann, size: Math.max(10, h), w };
                }
                return { ...ann, w, h };
            }));
        }
        if (interaction.mode === "text") {
            interaction.moved = Math.hypot(point.x - interaction.start.x, point.y - interaction.start.y) > 4;
        }
    };

    const handlePointerUp = () => {
        const interaction = interactionRef.current;
        interactionRef.current = null;
        if (!interaction) return;

        if (interaction.mode === "draw" && interaction.annotation?.points?.length > 1) {
            setAnnotations((prev) => [...prev, { ...interaction.annotation, id: nextId() }]);
        }
        if (interaction.mode === "highlight" && interaction.annotation && interaction.annotation.w > 4 && interaction.annotation.h > 4) {
            setAnnotations((prev) => [...prev, { ...interaction.annotation, id: nextId() }]);
        }
        if (interaction.mode === "text" && !interaction.moved && tool === "text" && textInput.trim()) {
            const id = nextId();
            setAnnotations((prev) => [
                ...prev,
                {
                    id,
                    type: "text",
                    page: pageNum,
                    text: textInput,
                    x: interaction.start.x,
                    y: interaction.start.y,
                    size: fontSize,
                    color: textColor,
                    fontId,
                },
            ]);
            setSelectedId(id);
        }
        setLive(null);
    };

    const addImage = async (dataUrl, width, height) => {
        if (!pageReady || !pageSizesRef.current[pageNum]) {
            setStatus("Wait for the page preview to finish loading.");
            return;
        }
        const id = nextId();
        const imageEl = new Image();
        imageEl.src = dataUrl;
        await imageEl.decode().catch(() => {});
        imageCacheRef.current.set(id, imageEl);
        const maxW = 180;
        const scale = Math.min(1, maxW / (width || maxW));
        setAnnotations((prev) => [
            ...prev,
            {
                id,
                type: "image",
                page: pageNum,
                dataUrl,
                x: 40,
                y: 40,
                w: (width || maxW) * scale,
                h: (height || maxW) * scale,
                rotation: 0,
            },
        ]);
        setSelectedId(id);
        setTool("picture");
    };

    const handleSave = async () => {
        if (!buffer || !file) return;
        if (!pageReady) {
            setStatus("Wait for the page preview to finish loading.");
            return;
        }
        setStatus("Embedding annotations…");

        try {
            const pdf = await loadPdfWithPdfLib(buffer);
            const fonts = {};
            for (const font of FONTS) {
                fonts[font.id] = await pdf.embedFont(font.embed);
            }
            const pages = pdf.getPages();

            for (const ann of annotations) {
                const page = pages[ann.page - 1];
                const scale = pageScale(page?.getSize(), pageSizesRef.current[ann.page]);
                if (!page || !scale) {
                    setStatus("Wait for every annotated page to finish loading.");
                    return;
                }
                const { width, height } = page.getSize();
                const scaleX = scale.x;
                const scaleY = scale.y;

                if (ann.type === "text") {
                    page.drawText(ann.text, {
                        x: ann.x * scaleX,
                        y: height - ann.y * scaleY,
                        size: (ann.size ?? 16) * scaleY,
                        font: fonts[ann.fontId] ?? fonts.Helvetica,
                        color: hexToRgbColor(ann.color),
                    });
                } else if (ann.type === "highlight") {
                    page.drawRectangle({
                        x: ann.x * scaleX,
                        y: height - (ann.y + ann.h) * scaleY,
                        width: ann.w * scaleX,
                        height: ann.h * scaleY,
                        color: hexToRgbColor(ann.color),
                        opacity: 0.35,
                    });
                } else if (ann.type === "draw") {
                    for (let i = 1; i < ann.points.length; i += 1) {
                        const from = ann.points[i - 1];
                        const to = ann.points[i];
                        page.drawLine({
                            start: { x: from.x * scaleX, y: height - from.y * scaleY },
                            end: { x: to.x * scaleX, y: height - to.y * scaleY },
                            thickness: (ann.size ?? 2) * scaleX,
                            color: hexToRgbColor(ann.color),
                            opacity: ann.opacity ?? 1,
                            lineCap: LineCapStyle.Round,
                        });
                    }
                } else if (ann.type === "image") {
                    const raw = ann.dataUrl.split(",")[1];
                    const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
                    const image = ann.dataUrl.includes("image/jpeg")
                        ? await pdf.embedJpg(bytes)
                        : await pdf.embedPng(bytes);
                    page.drawImage(image, {
                        x: ann.x * scaleX,
                        y: height - (ann.y + ann.h) * scaleY,
                        width: ann.w * scaleX,
                        height: ann.h * scaleY,
                        rotate: degrees(ann.rotation ?? 0),
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

    const selected = annotations.find((ann) => ann.id === selectedId);
    const pagePlacedImages = annotations.filter((ann) => ann.page === pageNum && ann.type === "image");

    return (
        <DocToolShell
            title="PDF Editor"
            description="Add text, drawings, highlights, and pictures onto PDF pages, then save a new file."
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
                            {["text", "draw", "highlight", "picture", "changes"].map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    className={`doc-tool-button cursor-target${(t === "changes" ? sidebar === "changes" : tool === t && sidebar !== "changes") ? " is-active" : ""}`}
                                    onClick={() => {
                                        if (t === "changes") {
                                            setSidebar("changes");
                                            return;
                                        }
                                        setSidebar(t === "picture" ? "picture" : "tools");
                                        setTool(t);
                                    }}
                                >
                                    {t === "picture" ? "Add Picture" : t === "changes" ? "All Changes" : t.charAt(0).toUpperCase() + t.slice(1)}
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
                                disabled={!pageReady}
                            >
                                Save & Download
                            </button>
                        </div>

                        {tool === "text" ? (
                            <div className="doc-tool-grid doc-tool-grid--3" style={{ marginTop: "0.75rem" }}>
                                <input
                                    className="doc-tool-input cursor-target"
                                    value={selected?.type === "text" ? selected.text : textInput}
                                    onChange={(e) => {
                                        if (selected?.type === "text") updateSelected({ text: e.target.value });
                                        else setTextInput(e.target.value);
                                    }}
                                    placeholder="Text to place — click on page"
                                />
                                <select
                                    className="doc-tool-select cursor-target"
                                    value={selected?.fontId ?? fontId}
                                    onChange={(e) => {
                                        setFontId(e.target.value);
                                        if (selected?.type === "text") updateSelected({ fontId: e.target.value });
                                    }}
                                >
                                    {FONTS.map((font) => (
                                        <option key={font.id} value={font.id}>{font.label}</option>
                                    ))}
                                </select>
                                <input
                                    className="doc-tool-input cursor-target"
                                    type="color"
                                    value={selected?.color ?? textColor}
                                    onChange={(e) => {
                                        setTextColor(e.target.value);
                                        if (selected?.type === "text") updateSelected({ color: e.target.value });
                                    }}
                                />
                                <input
                                    className="doc-tool-range cursor-target"
                                    type="range"
                                    min="10"
                                    max="72"
                                    value={selected?.size ?? fontSize}
                                    onChange={(e) => {
                                        const size = Number(e.target.value);
                                        setFontSize(size);
                                        if (selected?.type === "text") updateSelected({ size });
                                    }}
                                />
                            </div>
                        ) : null}

                        {tool === "draw" ? (
                            <div className="doc-tool-controls" style={{ marginTop: "0.75rem" }}>
                                {BRUSHES.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={`doc-tool-button cursor-target${brush === item.id ? " is-active" : ""}`}
                                        onClick={() => setBrush(item.id)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                                <div className="doc-tool-swatches">
                                    {DRAW_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`doc-tool-swatch cursor-target${drawColor === color ? " is-active" : ""}`}
                                            style={{ background: color }}
                                            onClick={() => setDrawColor(color)}
                                            aria-label={color}
                                        />
                                    ))}
                                </div>
                                <label className="doc-tool-label" style={{ margin: 0 }}>
                                    Size {drawSize}px
                                </label>
                                <input
                                    className="doc-tool-range cursor-target"
                                    type="range"
                                    min="1"
                                    max="24"
                                    value={drawSize}
                                    onChange={(e) => setDrawSize(Number(e.target.value))}
                                    style={{ maxWidth: 140 }}
                                />
                                <label className="doc-tool-label" style={{ margin: 0 }}>
                                    Opacity {Math.round(drawOpacity * 100)}%
                                </label>
                                <input
                                    className="doc-tool-range cursor-target"
                                    type="range"
                                    min="0.15"
                                    max="1"
                                    step="0.05"
                                    value={drawOpacity}
                                    onChange={(e) => setDrawOpacity(Number(e.target.value))}
                                    style={{ maxWidth: 140 }}
                                />
                            </div>
                        ) : null}

                        {tool === "highlight" ? (
                            <div className="doc-tool-controls" style={{ marginTop: "0.75rem" }}>
                                <span className="doc-tool-label" style={{ margin: 0 }}>Highlighter</span>
                                <div className="doc-tool-swatches">
                                    {HIGHLIGHT_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`doc-tool-swatch cursor-target${highlightColor === color ? " is-active" : ""}`}
                                            style={{ background: color }}
                                            onClick={() => setHighlightColor(color)}
                                            aria-label={color}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        <div className="doc-tool-editor-layout">
                            <div className="doc-tool-canvas-wrap">
                                <canvas
                                    ref={canvasRef}
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    className="cursor-target"
                                    style={{
                                        cursor: pageReady && (tool === "draw" || tool === "highlight") ? "crosshair" : "default",
                                        touchAction: "none",
                                        pointerEvents: pageReady ? "auto" : "none",
                                    }}
                                />
                            </div>

                            <aside className="doc-tool-panel" style={{ marginTop: 0 }}>
                                {sidebar === "changes" ? (
                                    <>
                                        <h2 className="doc-tool-section-title">All changes</h2>
                                        {annotations.length ? (
                                            <ul className="doc-tool-sidebar-list">
                                                {annotations.map((ann) => (
                                                    <li
                                                        key={ann.id}
                                                        className={`doc-tool-sidebar-item${ann.id === selectedId ? " is-active" : ""}`}
                                                    >
                                                        <strong style={{ color: "#f8fafc" }}>
                                                            {ann.type} · page {ann.page}
                                                        </strong>
                                                        <span className="doc-tool-status" style={{ margin: 0 }}>
                                                            {ann.text || ann.brush || ann.color || "image"}
                                                        </span>
                                                        <div className="doc-tool-controls" style={{ marginBottom: 0 }}>
                                                            <button
                                                                type="button"
                                                                className="doc-tool-button cursor-target"
                                                                onClick={() => {
                                                                    setPageNum(ann.page);
                                                                    setSelectedId(ann.id);
                                                                }}
                                                            >
                                                                Go to page
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="doc-tool-button cursor-target"
                                                                onClick={() => {
                                                                    setAnnotations((prev) => prev.filter((item) => item.id !== ann.id));
                                                                    if (selectedId === ann.id) setSelectedId("");
                                                                }}
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="doc-tool-empty">No changes yet.</p>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <h2 className="doc-tool-section-title">Pictures on this page</h2>
                                        <div className="doc-tool-thumb-row">
                                            {pageImages.map((image) => (
                                                <button
                                                    key={image.id}
                                                    type="button"
                                                    className="cursor-target"
                                                    onClick={() => addImage(image.dataUrl, image.width, image.height)}
                                                    title="Place this embedded image"
                                                >
                                                    <img src={image.dataUrl} alt="" />
                                                </button>
                                            ))}
                                            <button
                                                type="button"
                                                className="cursor-target"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                + Add an image
                                            </button>
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            hidden
                                            onChange={async (event) => {
                                                const next = event.target.files?.[0];
                                                event.target.value = "";
                                                if (!next) return;
                                                const dataUrl = await readFileAsDataUrl(next);
                                                const image = new Image();
                                                image.src = dataUrl;
                                                await image.decode().catch(() => {});
                                                addImage(dataUrl, image.naturalWidth, image.naturalHeight);
                                            }}
                                        />
                                        {pagePlacedImages.length ? (
                                            <ul className="doc-tool-sidebar-list" style={{ marginTop: "0.75rem" }}>
                                                {pagePlacedImages.map((ann, index) => (
                                                    <li
                                                        key={ann.id}
                                                        className={`doc-tool-sidebar-item${ann.id === selectedId ? " is-active" : ""}`}
                                                    >
                                                        <button
                                                            type="button"
                                                            className="doc-tool-button cursor-target"
                                                            onClick={() => setSelectedId(ann.id)}
                                                        >
                                                            Picture {index + 1}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="doc-tool-empty">No pictures placed on this page yet.</p>
                                        )}
                                    </>
                                )}
                            </aside>
                        </div>
                    </>
                ) : null}

                {status ? <p className="doc-tool-status">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default PdfEditor;

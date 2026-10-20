import { handleFilePickerKeyDown } from "../_shared/imageToolUtils";
import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import ImageToolRange from "../_shared/ImageToolRange";
import {
    MB,
    IMAGE_ACCEPT,
    formatBytes,
    validateStandardImage,
    loadImageFromFileWithProgress,
    canvasToBlob,
    triggerDownload,
    copyBlobToClipboard,
    replaceExtension,
    clamp,
    waitFrame,
    preventDragDefaults,
} from "../_shared/imageToolUtils";

const MAX_BYTES = 30 * MB;
const MAX_HISTORY = 10;

function cloneMasks(masks) {
    return masks.map((m) => ({
        ...m,
        points: m.points ? m.points.map((p) => ({ ...p })) : undefined,
        rect: m.rect ? { ...m.rect } : undefined,
        stroke: m.stroke
            ? { width: m.stroke.width, points: m.stroke.points.map((p) => ({ ...p })) }
            : undefined,
    }));
}

function drawStrokePath(ctx, points, width) {
    if (!points?.length) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = width;
    if (points.length === 1) {
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, width / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
    }
    ctx.beginPath();
    points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
}

function applyEffectToPatch(tctx, image, sx, sy, sw, sh, effectType, effectSize) {
    tctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);

    if (effectType === "pixelate") {
        const block = clamp(effectSize, 4, 64);
        const small = document.createElement("canvas");
        small.width = Math.max(1, Math.floor(sw / block));
        small.height = Math.max(1, Math.floor(sh / block));
        const sctx = small.getContext("2d");
        sctx.imageSmoothingEnabled = false;
        sctx.drawImage(tctx.canvas, 0, 0, small.width, small.height);
        tctx.imageSmoothingEnabled = false;
        tctx.clearRect(0, 0, sw, sh);
        tctx.drawImage(small, 0, 0, sw, sh);
    } else if (effectType === "blur") {
        const blurred = document.createElement("canvas");
        blurred.width = sw;
        blurred.height = sh;
        const bctx = blurred.getContext("2d");
        bctx.filter = `blur(${clamp(effectSize, 4, 64)}px)`;
        bctx.drawImage(tctx.canvas, 0, 0);
        tctx.clearRect(0, 0, sw, sh);
        tctx.drawImage(blurred, 0, 0);
    }
}

function applyStrokeMask(ctx, image, stroke, effectType, effectSize) {
    const { points, width: brushWidth } = stroke;
    if (!points?.length) return;

    const imgW = image.width;
    const imgH = image.height;
    const pad = Math.max(brushWidth, effectSize) + 8;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const bx = clamp(Math.min(...xs) - pad, 0, imgW);
    const by = clamp(Math.min(...ys) - pad, 0, imgH);
    const bw = clamp(Math.max(...xs) - bx + pad, 1, imgW - bx);
    const bh = clamp(Math.max(...ys) - by + pad, 1, imgH - by);

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = imgW;
    maskCanvas.height = imgH;
    const mctx = maskCanvas.getContext("2d");
    mctx.fillStyle = "#ffffff";
    mctx.strokeStyle = "#ffffff";
    drawStrokePath(mctx, points, brushWidth);

    const layer = document.createElement("canvas");
    layer.width = imgW;
    layer.height = imgH;
    const lctx = layer.getContext("2d");

    if (effectType === "bar") {
        lctx.fillStyle = "#000000";
        drawStrokePath(lctx, points, brushWidth);
    } else {
        const temp = document.createElement("canvas");
        temp.width = bw;
        temp.height = bh;
        const tctx = temp.getContext("2d");
        applyEffectToPatch(tctx, image, bx, by, bw, bh, effectType, effectSize);
        lctx.drawImage(temp, bx, by);
        lctx.globalCompositeOperation = "destination-in";
        lctx.drawImage(maskCanvas, 0, 0);
        lctx.globalCompositeOperation = "source-over";
    }

    ctx.drawImage(layer, 0, 0);
}

function applyMaskEffect(ctx, image, mask, effectType, effectSize) {
    if (mask.stroke) {
        applyStrokeMask(ctx, image, mask.stroke, effectType, effectSize);
        return;
    }

    const { rect, points } = mask;
    let x;
    let y;
    let w;
    let h;
    if (rect) {
        x = rect.x;
        y = rect.y;
        w = rect.w;
        h = rect.h;
    } else if (points?.length) {
        x = Math.min(...points.map((p) => p.x));
        y = Math.min(...points.map((p) => p.y));
        w = Math.max(...points.map((p) => p.x)) - x;
        h = Math.max(...points.map((p) => p.y)) - y;
    } else return;

    if (w < 1 || h < 1) return;

    if (effectType === "bar") {
        ctx.fillStyle = "#000";
        if (rect) {
            ctx.fillRect(x, y, w, h);
        } else {
            ctx.beginPath();
            points.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.fill();
        }
        return;
    }

    const pad = effectType === "blur" ? effectSize : 0;
    const sx = clamp(x - pad, 0, image.width);
    const sy = clamp(y - pad, 0, image.height);
    const sw = clamp(w + pad * 2, 1, image.width - sx);
    const sh = clamp(h + pad * 2, 1, image.height - sy);

    const temp = document.createElement("canvas");
    temp.width = sw;
    temp.height = sh;
    const tctx = temp.getContext("2d");
    applyEffectToPatch(tctx, image, sx, sy, sw, sh, effectType, effectSize);

    ctx.save();
    if (rect) {
        ctx.drawImage(temp, 0, 0, sw, sh, x, y, w, h);
    } else {
        ctx.beginPath();
        points.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(temp, 0, 0, sw, sh, sx, sy, sw, sh);
    }
    ctx.restore();
}

function renderWithMasks(canvas, image, masks, effectType, effectSize) {
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    masks.forEach((mask) => applyMaskEffect(ctx, image, mask, effectType, effectSize));
}

function drawBrushPreview(ctx, points, brushWidth, currentPoint) {
    if (!points?.length) return;
    ctx.save();
    ctx.strokeStyle = "rgba(16, 185, 129, 0.85)";
    ctx.fillStyle = "rgba(16, 185, 129, 0.35)";
    const previewPoints = currentPoint ? [...points, currentPoint] : points;
    drawStrokePath(ctx, previewPoints, brushWidth);
    ctx.restore();
}

export default function BlurCensorTool() {
    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    const sourceRef = useRef(null);
    const operationRef = useRef(0);
    const drawRef = useRef(null);

    const [file, setFile] = useState(null);
    const [imageSize, setImageSize] = useState(null);
    const [effectType, setEffectType] = useState("pixelate");
    const [tool, setTool] = useState("rect");
    const [brushStrokeSize, setBrushStrokeSize] = useState(24);
    const [effectStrength, setEffectStrength] = useState(24);
    const [masks, setMasks] = useState([]);
    const [history, setHistory] = useState([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const releaseSource = useCallback(() => {
        if (sourceRef.current?.objectUrl) URL.revokeObjectURL(sourceRef.current.objectUrl);
        sourceRef.current = null;
    }, []);

    const pushHistory = useCallback(
        (nextMasks) => {
            const trimmed = history.slice(0, historyIndex + 1);
            trimmed.push(cloneMasks(nextMasks));
            const capped = trimmed.slice(-MAX_HISTORY);
            setHistory(capped);
            setHistoryIndex(capped.length - 1);
            setMasks(nextMasks);
        },
        [history, historyIndex],
    );

    const resetAll = useCallback(() => {
        operationRef.current += 1;
        releaseSource();
        setFile(null);
        setImageSize(null);
        setMasks([]);
        setHistory([[]]);
        setHistoryIndex(0);
        setError("");
        setStatus("");
        setProgress(0);
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [releaseSource]);

    const ingestFile = useCallback(
        async (nextFile) => {
            const validation = validateStandardImage(nextFile, MAX_BYTES);
            if (!validation.ok) {
                setError(validation.error);
                return;
            }
            const op = operationRef.current + 1;
            operationRef.current = op;
            releaseSource();
            setError("");
            setStatus("");
            setIsProcessing(true);
            setProgress(0);
            try {
                const loaded = await loadImageFromFileWithProgress(nextFile, (p) => {
                    if (operationRef.current === op) setProgress(p);
                });
                if (operationRef.current !== op) {
                    URL.revokeObjectURL(loaded.objectUrl);
                    return;
                }
                sourceRef.current = loaded;
                setFile(nextFile);
                setImageSize({ width: loaded.width, height: loaded.height });
                setMasks([]);
                setHistory([[]]);
                setHistoryIndex(0);
            } catch (e) {
                if (operationRef.current === op) setError(e.message || "Failed to load image.");
            } finally {
                if (operationRef.current === op) {
                    setIsProcessing(false);
                    setProgress(0);
                }
            }
        },
        [releaseSource],
    );

    const applyEntireImageMask = () => {
        if (!imageSize) return;
        const fullMask = {
            rect: { x: 0, y: 0, w: imageSize.width, h: imageSize.height },
        };
        pushHistory([...masks, fullMask]);
        setStatus("Effect applied to entire image.");
    };

    const handleToolChange = (nextTool) => {
        setTool(nextTool);
        if (nextTool === "full") {
            applyEntireImageMask();
        }
    };

    const getScale = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !imageSize) return 1;
        const rect = canvas.getBoundingClientRect();
        return Math.min(rect.width / imageSize.width, rect.height / imageSize.height, 1);
    }, [imageSize]);

    const toImageCoords = (clientX, clientY) => {
        const canvas = canvasRef.current;
        if (!canvas || !imageSize) return null;
        const rect = canvas.getBoundingClientRect();
        const scale = getScale();
        const ox = (rect.width - imageSize.width * scale) / 2;
        const oy = (rect.height - imageSize.height * scale) / 2;
        return {
            x: clamp((clientX - rect.left - ox) / scale, 0, imageSize.width),
            y: clamp((clientY - rect.top - oy) / scale, 0, imageSize.height),
        };
    };

    const drawPreview = useCallback(() => {
        const canvas = canvasRef.current;
        const src = sourceRef.current;
        if (!canvas || !src?.image || !imageSize) return;
        renderWithMasks(canvas, src.image, masks, effectType, effectStrength);
        const rect = canvas.parentElement?.getBoundingClientRect();
        const scale = Math.min((rect?.width || 400) / imageSize.width, (rect?.height || 300) / imageSize.height, 1);
        canvas.style.width = `${imageSize.width * scale}px`;
        canvas.style.height = `${imageSize.height * scale}px`;
    }, [imageSize, masks, effectType, effectStrength]);

    useEffect(() => {
        drawPreview();
    }, [drawPreview]);

    const handlePointerDown = (e) => {
        if (!imageSize || isProcessing || tool === "full") return;
        const pt = toImageCoords(e.clientX, e.clientY);
        if (!pt) return;
        if (tool === "rect") {
            drawRef.current = { type: "rect", start: pt, current: pt };
        } else {
            drawRef.current = { type: "brush", points: [pt], current: pt };
        }
    };

    const handlePointerMove = (e) => {
        const d = drawRef.current;
        if (!d || !imageSize) return;
        const pt = toImageCoords(e.clientX, e.clientY);
        if (!pt) return;
        const canvas = canvasRef.current;
        const src = sourceRef.current;
        if (!canvas || !src?.image) return;

        if (d.type === "rect") {
            drawRef.current = { ...d, current: pt };
            renderWithMasks(canvas, src.image, masks, effectType, effectStrength);
            const ctx = canvas.getContext("2d");
            const x = Math.min(d.start.x, pt.x);
            const y = Math.min(d.start.y, pt.y);
            const w = Math.abs(pt.x - d.start.x);
            const h = Math.abs(pt.y - d.start.y);
            ctx.strokeStyle = "#10b981";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
        } else {
            const last = d.points[d.points.length - 1];
            const dist = Math.hypot(pt.x - last.x, pt.y - last.y);
            const nextPoints = dist >= 1 ? [...d.points, pt] : d.points;
            drawRef.current = { ...d, points: nextPoints, current: pt };
            renderWithMasks(canvas, src.image, masks, effectType, effectStrength);
            const ctx = canvas.getContext("2d");
            drawBrushPreview(ctx, nextPoints, brushStrokeSize, dist < 1 ? pt : null);
        }
    };

    const handlePointerUp = () => {
        const d = drawRef.current;
        if (!d) return;
        drawRef.current = null;
        let nextMask = null;
        if (d.type === "rect" && d.current) {
            const x = Math.min(d.start.x, d.current.x);
            const y = Math.min(d.start.y, d.current.y);
            const w = Math.abs(d.current.x - d.start.x);
            const h = Math.abs(d.current.y - d.start.y);
            if (w > 4 && h > 4) nextMask = { rect: { x, y, w, h } };
        } else if (d.type === "brush" && d.points?.length >= 1) {
            nextMask = { stroke: { points: d.points, width: brushStrokeSize } };
        }
        if (nextMask) pushHistory([...masks, nextMask]);
    };

    useEffect(() => {
        const onMove = (e) => handlePointerMove(e);
        const onUp = () => handlePointerUp();
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        return () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
    });

    const undo = () => {
        if (historyIndex <= 0) return;
        const next = historyIndex - 1;
        setHistoryIndex(next);
        setMasks(cloneMasks(history[next]));
    };

    const redo = () => {
        if (historyIndex >= history.length - 1) return;
        const next = historyIndex + 1;
        setHistoryIndex(next);
        setMasks(cloneMasks(history[next]));
    };

    const clearAll = () => pushHistory([]);

    const renderOutput = async () => {
        const src = sourceRef.current;
        if (!src?.image || !imageSize) throw new Error("Load an image first.");
        const canvas = document.createElement("canvas");
        renderWithMasks(canvas, src.image, masks, effectType, effectStrength);
        await waitFrame();
        return canvasToBlob(canvas, "image/png");
    };

    const handleDownload = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        setProgress(50);
        setError("");
        try {
            const blob = await renderOutput();
            triggerDownload(blob, replaceExtension(file?.name || "image", "png"));
            setStatus("Download started.");
            setProgress(100);
        } catch (e) {
            setError(e.message || "Download failed.");
        } finally {
            setIsProcessing(false);
            setTimeout(() => setProgress(0), 400);
        }
    };

    const handleCopy = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        setError("");
        try {
            const blob = await renderOutput();
            await copyBlobToClipboard(blob);
            setStatus("Copied to clipboard.");
        } catch (e) {
            setError(e.message || "Copy failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    const left = (
        <>
            <div
                role="button"
                tabIndex={isProcessing ? -1 : 0}
                aria-disabled={isProcessing}
                onKeyDown={handleFilePickerKeyDown}
                onClick={() => { if (!isProcessing) fileInputRef.current?.click(); }}
                className={`img-tool__dropzone${isDraggingFile ? " is-dragging" : ""}${isProcessing ? " is-disabled" : ""}`}
                onDragEnter={(e) => {
                    preventDragDefaults(e);
                    if (!isProcessing) setIsDraggingFile(true);
                }}
                onDragOver={preventDragDefaults}
                onDragLeave={(e) => {
                    preventDragDefaults(e);
                    if (!e.currentTarget.contains(e.relatedTarget)) setIsDraggingFile(false);
                }}
                onDrop={(e) => {
                    preventDragDefaults(e);
                    setIsDraggingFile(false);
                    if (!isProcessing && e.dataTransfer.files?.[0]) ingestFile(e.dataTransfer.files[0]);
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={IMAGE_ACCEPT}
                    className="img-tool__dropzone-input"
                    disabled={isProcessing}
                    onChange={(e) => e.target.files?.[0] && ingestFile(e.target.files[0])}
                />
                <p className="img-tool__dropzone-text">Drop an image (max 30 MB)</p>
            </div>
            {file && imageSize ? (
                <div className="img-tool__meta">
                    <span className="img-tool__chip"><strong>{file.name}</strong></span>
                    <span className="img-tool__chip">{imageSize.width}×{imageSize.height}</span>
                    <span className="img-tool__chip">{formatBytes(file.size)}</span>
                </div>
            ) : null}
            <div>
                <span className="img-tool__label">Censor type</span>
                <div className="img-tool__segmented">
                    {[
                        ["pixelate", "Pixelate"],
                        ["blur", "Gaussian Blur"],
                        ["bar", "Black Bar"],
                    ].map(([key, label]) => (
                        <button aria-pressed={effectType === key}
                            key={key}
                            type="button"
                            className={`img-tool__segment${effectType === key ? " is-active" : ""}`}
                            disabled={!imageSize}
                            onClick={() => setEffectType(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <span className="img-tool__label">Drawing tool</span>
                <div className="img-tool__segmented">
                    <button aria-pressed={tool === "rect"}
                        type="button"
                        className={`img-tool__segment${tool === "rect" ? " is-active" : ""}`}
                        disabled={!imageSize}
                        onClick={() => handleToolChange("rect")}
                    >
                        Rectangle
                    </button>
                    <button aria-pressed={tool === "brush"}
                        type="button"
                        className={`img-tool__segment${tool === "brush" ? " is-active" : ""}`}
                        disabled={!imageSize}
                        onClick={() => handleToolChange("brush")}
                    >
                        Freehand
                    </button>
                    <button aria-pressed={tool === "full"}
                        type="button"
                        className={`img-tool__segment${tool === "full" ? " is-active" : ""}`}
                        disabled={!imageSize}
                        onClick={() => handleToolChange("full")}
                    >
                        Entire image
                    </button>
                </div>
            </div>
            {tool === "brush" ? (
                <ImageToolRange
                    id="bc-brush-size"
                    label="Brush size"
                    min={5}
                    max={100}
                    value={brushStrokeSize}
                    disabled={!imageSize}
                    onChange={setBrushStrokeSize}
                    unit="px"
                    lowLabel="5px"
                    highLabel="100px"
                />
            ) : null}
            {effectType !== "bar" ? (
                <ImageToolRange
                    id="bc-effect-strength"
                    label={effectType === "pixelate" ? "Block size" : "Blur radius"}
                    min={4}
                    max={64}
                    value={effectStrength}
                    disabled={!imageSize}
                    onChange={setEffectStrength}
                    unit="px"
                    lowLabel="4px"
                    highLabel="64px"
                />
            ) : null}
            <div className="img-tool__actions" style={{ marginTop: 0 }}>
                <button type="button" className="img-tool__btn" disabled={!imageSize || historyIndex <= 0} onClick={undo}>
                    Undo
                </button>
                <button type="button" className="img-tool__btn" disabled={!imageSize || historyIndex >= history.length - 1} onClick={redo}>
                    Redo
                </button>
                <button type="button" className="img-tool__btn" disabled={!imageSize || masks.length === 0} onClick={clearAll}>
                    Clear
                </button>
            </div>
            <p className="img-tool__hint">Freehand brush uses smooth round strokes. History keeps up to {MAX_HISTORY} steps.</p>
            <div className="img-tool__actions">
                <button type="button" className="img-tool__btn img-tool__btn--primary" disabled={!imageSize || isProcessing} onClick={handleDownload}>
                    Download
                </button>
                <button type="button" className="img-tool__btn" disabled={!imageSize || isProcessing} onClick={handleCopy}>
                    Copy
                </button>
                <button type="button" className="img-tool__btn" disabled={!imageSize || isProcessing} onClick={resetAll}>
                    Reset
                </button>
            </div>
        </>
    );

    const right = (
        <div className="img-tool__preview-frame" style={{ maxHeight: "min(50vh, 380px)" }}>
            {imageSize ? (
                <canvas
                    ref={canvasRef}
                    className="img-tool__preview-canvas"
                    style={{ cursor: "crosshair", touchAction: "none" }}
                    onPointerDown={handlePointerDown}
                />
            ) : (
                <p className="img-tool__preview-empty">Upload an image, then draw masks to censor areas</p>
            )}
        </div>
    );

    return (
        <ImageToolWorkspace
            title="Blur & Censor"
            error={error}
            status={status}
            left={left}
            right={right}
            showProgress={isProcessing || progress > 0}
            progress={progress}
            progressLabel="Loading image"
        />
    );
}

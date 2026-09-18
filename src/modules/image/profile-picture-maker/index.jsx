import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import {MB,
    IMAGE_ACCEPT,
    formatBytes,
    validateStandardImage,
    loadImageFromFileWithProgress,
    canvasToBlob,
    triggerDownload,
    copyBlobToClipboard,
    replaceExtension,
    normalizeHexColor,
    clamp,
    waitFrame, preventDragDefaults } from "../_shared/imageToolUtils";
// preventDragDefaults imported below

const MAX_BYTES = 30 * MB;
const BORDER_SWATCHES = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ffffff", "#000000"];
const GRADIENTS = {
    sunset: ["#f97316", "#ec4899"],
    ocean: ["#0ea5e9", "#6366f1"],
    forest: ["#22c55e", "#14b8a6"],
};

function pathRoundRect(ctx, x, y, w, h, radius) {
    const r = Math.min(radius, w / 2, h / 2);
    if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        return;
    }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function drawAvatar(canvas, image, options) {
    const {
        outputSize,
        zoom,
        panX,
        panY,
        border,
        borderColor,
        cornerRadiusPercent,
        bgType,
        bgColor,
        gradientKey,
    } = options;
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    const center = outputSize / 2;
    const innerSize = outputSize - border * 2;
    const innerX = border;
    const innerY = border;
    const cornerRadius = (cornerRadiusPercent / 50) * (innerSize / 2);

    ctx.clearRect(0, 0, outputSize, outputSize);

    if (bgType === "solid") {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, outputSize, outputSize);
    } else if (bgType === "gradient") {
        const [c1, c2] = GRADIENTS[gradientKey] || GRADIENTS.sunset;
        const grad = ctx.createLinearGradient(0, 0, outputSize, outputSize);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, outputSize, outputSize);
    }

    ctx.save();
    pathRoundRect(ctx, innerX, innerY, innerSize, innerSize, cornerRadius);
    ctx.clip();

    const imgW = image.width;
    const imgH = image.height;
    const coverScale = Math.max(outputSize / imgW, outputSize / imgH) * zoom;
    const drawW = imgW * coverScale;
    const drawH = imgH * coverScale;
    const dx = center - drawW / 2 + panX;
    const dy = center - drawH / 2 + panY;
    ctx.drawImage(image, dx, dy, drawW, drawH);
    ctx.restore();

    if (border > 0) {
        pathRoundRect(ctx, border / 2, border / 2, outputSize - border, outputSize - border, cornerRadius + border / 2);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = border;
        ctx.stroke();
    }
}

export default function ProfilePictureMakerTool() {
    const fileInputRef = useRef(null);
    const previewCanvasRef = useRef(null);
    const sourceRef = useRef(null);
    const operationRef = useRef(0);
    const dragRef = useRef(null);

    const [file, setFile] = useState(null);
    const [imageSize, setImageSize] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [border, setBorder] = useState(4);
    const [cornerRadiusPercent, setCornerRadiusPercent] = useState(50);
    const [borderColor, setBorderColor] = useState("#10b981");
    const [bgType, setBgType] = useState("transparent");
    const [bgColor, setBgColor] = useState("#1e293b");
    const [gradientKey, setGradientKey] = useState("sunset");
    const [outputSize, setOutputSize] = useState(512);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const options = {
        outputSize: 512,
        zoom,
        panX: pan.x,
        panY: pan.y,
        border,
        cornerRadiusPercent,
        borderColor: normalizeHexColor(borderColor),
        bgType,
        bgColor: normalizeHexColor(bgColor),
        gradientKey,
    };

    const releaseSource = useCallback(() => {
        if (sourceRef.current?.objectUrl) URL.revokeObjectURL(sourceRef.current.objectUrl);
        sourceRef.current = null;
    }, []);

    const resetAll = useCallback(() => {
        operationRef.current += 1;
        releaseSource();
        setFile(null);
        setImageSize(null);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setBorder(4);
        setCornerRadiusPercent(50);
        setBorderColor("#10b981");
        setBgType("transparent");
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
                setZoom(1);
                setPan({ x: 0, y: 0 });
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

    const drawPreview = useCallback(() => {
        const canvas = previewCanvasRef.current;
        const src = sourceRef.current;
        if (!canvas || !src?.image) return;
        const previewOpts = { ...options, outputSize: 320 };
        drawAvatar(canvas, src.image, previewOpts);
        canvas.style.width = "280px";
        canvas.style.height = "280px";
    }, [options]);

    useEffect(() => {
        drawPreview();
    }, [drawPreview]);

    const handlePointerDown = (e) => {
        if (!imageSize) return;
        dragRef.current = { startX: e.clientX, startY: e.clientY, startPan: { ...pan } };
    };

    const handlePointerMove = (e) => {
        const d = dragRef.current;
        if (!d) return;
        const scale = 320 / outputSize;
        setPan({
            x: d.startPan.x + (e.clientX - d.startX) / scale,
            y: d.startPan.y + (e.clientY - d.startY) / scale,
        });
    };

    const handlePointerUp = () => {
        dragRef.current = null;
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

    const renderOutput = async () => {
        const src = sourceRef.current;
        if (!src?.image) throw new Error("Load an image first.");
        const canvas = document.createElement("canvas");
        drawAvatar(canvas, src.image, { ...options, outputSize });
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
            triggerDownload(blob, replaceExtension(file?.name || "avatar", "png"));
            setStatus("Avatar download started.");
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
            setStatus("Avatar copied to clipboard.");
        } catch (e) {
            setError(e.message || "Copy failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    const left = (
        <>
            <label
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
                <p className="img-tool__dropzone-text">Drop a photo (max 30 MB)</p>
            </label>
            {file && imageSize ? (
                <div className="img-tool__meta">
                    <span className="img-tool__chip"><strong>{file.name}</strong></span>
                    <span className="img-tool__chip">{imageSize.width}×{imageSize.height}</span>
                    <span className="img-tool__chip">{formatBytes(file.size)}</span>
                </div>
            ) : null}
            <div>
                <label className="img-tool__label">Zoom ({zoom.toFixed(2)}×)</label>
                <input
                    className="img-tool__range"
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    disabled={!imageSize}
                    onChange={(e) => setZoom(Number(e.target.value))}
                />
            </div>
            <div>
                <label className="img-tool__label" htmlFor="pp-corner-radius">Corner radius</label>
                <input
                    id="pp-corner-radius"
                    className="img-tool__range"
                    type="range"
                    min={0}
                    max={50}
                    value={cornerRadiusPercent}
                    disabled={!imageSize}
                    onChange={(e) => setCornerRadiusPercent(Number(e.target.value))}
                />
                <div className="img-tool__range-meta">
                    <span>Square (0%)</span>
                    <span className="img-tool__range-value">{cornerRadiusPercent}%</span>
                    <span>Circle (50%)</span>
                </div>
            </div>
            <div>
                <label className="img-tool__label">Border ({border}px)</label>
                <input
                    className="img-tool__range"
                    type="range"
                    min={0}
                    max={24}
                    value={border}
                    disabled={!imageSize}
                    onChange={(e) => setBorder(Number(e.target.value))}
                />
            </div>
            <div>
                <span className="img-tool__label">Border color</span>
                <div className="img-tool__segmented" style={{ flexWrap: "wrap" }}>
                    {BORDER_SWATCHES.map((c) => (
                        <button
                            key={c}
                            type="button"
                            className={`img-tool__segment${borderColor === c ? " is-active" : ""}`}
                            disabled={!imageSize}
                            style={{ padding: "0.35rem 0.5rem" }}
                            onClick={() => setBorderColor(c)}
                        >
                            <span
                                style={{
                                    display: "inline-block",
                                    width: 16,
                                    height: 16,
                                    borderRadius: 999,
                                    background: c,
                                    border: "1px solid rgba(255,255,255,0.3)",
                                }}
                            />
                        </button>
                    ))}
                </div>
                <div className="img-tool__color-row" style={{ marginTop: "0.5rem" }}>
                    <input
                        type="color"
                        className="img-tool__color-input"
                        value={borderColor}
                        disabled={!imageSize}
                        onChange={(e) => setBorderColor(e.target.value)}
                    />
                    <input
                        className="img-tool__input"
                        value={borderColor}
                        disabled={!imageSize}
                        onChange={(e) => setBorderColor(normalizeHexColor(e.target.value, borderColor))}
                    />
                </div>
            </div>
            <div>
                <span className="img-tool__label">Background</span>
                <div className="img-tool__segmented">
                    {[
                        ["transparent", "Transparent"],
                        ["solid", "Solid"],
                        ["gradient", "Gradient"],
                    ].map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            className={`img-tool__segment${bgType === key ? " is-active" : ""}`}
                            disabled={!imageSize}
                            onClick={() => setBgType(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            {bgType === "solid" ? (
                <div className="img-tool__color-row">
                    <input
                        type="color"
                        className="img-tool__color-input"
                        value={bgColor}
                        disabled={!imageSize}
                        onChange={(e) => setBgColor(e.target.value)}
                    />
                    <input
                        className="img-tool__input"
                        value={bgColor}
                        disabled={!imageSize}
                        onChange={(e) => setBgColor(normalizeHexColor(e.target.value, bgColor))}
                    />
                </div>
            ) : null}
            {bgType === "gradient" ? (
                <div className="img-tool__segmented">
                    {Object.keys(GRADIENTS).map((key) => (
                        <button
                            key={key}
                            type="button"
                            className={`img-tool__segment${gradientKey === key ? " is-active" : ""}`}
                            disabled={!imageSize}
                            onClick={() => setGradientKey(key)}
                        >
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                        </button>
                    ))}
                </div>
            ) : null}
            <div>
                <span className="img-tool__label">Output size</span>
                <div className="img-tool__segmented">
                    {[512, 1024].map((s) => (
                        <button
                            key={s}
                            type="button"
                            className={`img-tool__segment${outputSize === s ? " is-active" : ""}`}
                            disabled={!imageSize}
                            onClick={() => setOutputSize(s)}
                        >
                            {s}px
                        </button>
                    ))}
                </div>
            </div>
            <p className="img-tool__hint">Drag the preview to reposition the photo inside the frame.</p>
            <div className="img-tool__actions">
                <button type="button" className="img-tool__btn img-tool__btn--primary" disabled={!imageSize || isProcessing} onClick={handleDownload}>
                    Download Avatar
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
                    ref={previewCanvasRef}
                    className="img-tool__preview-canvas"
                    style={{ cursor: "grab" }}
                    onPointerDown={handlePointerDown}
                />
            ) : (
                <p className="img-tool__preview-empty">Upload a photo to create a profile avatar</p>
            )}
        </div>
    );

    return (
        <ImageToolWorkspace
            title="Profile Picture Maker"
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

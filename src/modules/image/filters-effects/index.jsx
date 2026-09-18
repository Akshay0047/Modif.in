import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import {MB,
    formatBytes,
    validateFile,
    loadImageFromFileWithProgress,
    canvasToBlob,
    triggerDownload,
    copyBlobToClipboard,
    replaceExtension,
    normalizeHexColor,
    waitFrame, preventDragDefaults } from "../_shared/imageToolUtils";
// preventDragDefaults imported below

const MAX_BYTES = 30 * MB;
const ACCEPT = "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp";

const PRESETS = {
    grayscale: { label: "Grayscale", filter: "grayscale(100%)" },
    sepia: { label: "Sepia", filter: "sepia(100%)" },
    vintage: { label: "Vintage Warm", filter: "sepia(40%) contrast(110%) brightness(105%) saturate(120%)" },
    invert: { label: "Invert", filter: "invert(100%)" },
    duotone: { label: "Duotone", filter: null },
    technicolor: { label: "Technicolor", filter: "saturate(180%) contrast(115%) hue-rotate(-10deg)" },
    hcbw: { label: "High Contrast B&W", filter: "grayscale(100%) contrast(160%)" },
};

function validateFilterFile(file) {
    return validateFile(file, {
        maxBytes: MAX_BYTES,
        extensions: [/\.(png|jpe?g|webp)$/i],
        mimes: new Set(["image/png", "image/jpeg", "image/webp"]),
        sizeMessage: "File exceeds 30 MB limit.",
        typeMessage: "Unsupported file type. Please upload PNG, JPG, or WEBP.",
    });
}

function hexToRgb(hex) {
    const n = normalizeHexColor(hex);
    return {
        r: parseInt(n.slice(1, 3), 16),
        g: parseInt(n.slice(3, 5), 16),
        b: parseInt(n.slice(5, 7), 16),
    };
}

function applyDuotone(imageData, colorA, colorB, intensity) {
    const a = hexToRgb(colorA);
    const b = hexToRgb(colorB);
    const t = intensity / 100;
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const bch = data[i + 2];
        const lum = (0.299 * r + 0.587 * g + 0.114 * bch) / 255;
        const nr = a.r + (b.r - a.r) * lum;
        const ng = a.g + (b.g - a.g) * lum;
        const nb = a.b + (b.b - a.b) * lum;
        data[i] = Math.round(r + (nr - r) * t);
        data[i + 1] = Math.round(g + (ng - g) * t);
        data[i + 2] = Math.round(bch + (nb - bch) * t);
    }
    return imageData;
}

function drawWithFilterIntensity(ctx, image, w, h, baseFilter, intensity) {
    if (intensity <= 0) {
        ctx.drawImage(image, 0, 0);
        return;
    }
    if (intensity >= 100) {
        ctx.filter = baseFilter;
        ctx.drawImage(image, 0, 0);
        ctx.filter = "none";
        return;
    }
    const temp = document.createElement("canvas");
    temp.width = w;
    temp.height = h;
    const tctx = temp.getContext("2d");
    tctx.filter = baseFilter;
    tctx.drawImage(image, 0, 0);
    ctx.drawImage(image, 0, 0);
    ctx.globalAlpha = intensity / 100;
    ctx.drawImage(temp, 0, 0);
    ctx.globalAlpha = 1;
}

export default function FiltersEffectsTool() {
    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    const sourceRef = useRef(null);
    const operationRef = useRef(0);

    const [file, setFile] = useState(null);
    const [imageSize, setImageSize] = useState(null);
    const [preset, setPreset] = useState("grayscale");
    const [intensity, setIntensity] = useState(100);
    const [duoA, setDuoA] = useState("#1e3a5f");
    const [duoB, setDuoB] = useState("#f59e0b");
    const [exportFormat, setExportFormat] = useState("png");
    const [quality, setQuality] = useState(90);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const releaseSource = useCallback(() => {
        if (sourceRef.current?.objectUrl) URL.revokeObjectURL(sourceRef.current.objectUrl);
        sourceRef.current = null;
    }, []);

    const resetAll = useCallback(() => {
        operationRef.current += 1;
        releaseSource();
        setFile(null);
        setImageSize(null);
        setPreset("grayscale");
        setIntensity(100);
        setDuoA("#1e3a5f");
        setDuoB("#f59e0b");
        setError("");
        setStatus("");
        setProgress(0);
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [releaseSource]);

    const ingestFile = useCallback(
        async (nextFile) => {
            const validation = validateFilterFile(nextFile);
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

    const renderToCanvas = useCallback(
        (canvas, ctx) => {
            const src = sourceRef.current;
            if (!src?.image || !imageSize) return;
            canvas.width = imageSize.width;
            canvas.height = imageSize.height;
            if (preset === "duotone") {
                ctx.filter = "none";
                ctx.drawImage(src.image, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                ctx.putImageData(applyDuotone(imageData, duoA, duoB, intensity), 0, 0);
            } else {
                const base = PRESETS[preset]?.filter || "none";
                drawWithFilterIntensity(ctx, src.image, canvas.width, canvas.height, base, intensity);
            }
        },
        [imageSize, preset, intensity, duoA, duoB],
    );

    const drawPreview = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !imageSize) return;
        const ctx = canvas.getContext("2d");
        renderToCanvas(canvas, ctx);
        const frame = canvas.parentElement?.getBoundingClientRect();
        const maxW = frame?.width || 400;
        const maxH = frame?.height || 300;
        const scale = Math.min(maxW / imageSize.width, maxH / imageSize.height, 1);
        canvas.style.width = `${imageSize.width * scale}px`;
        canvas.style.height = `${imageSize.height * scale}px`;
    }, [imageSize, renderToCanvas]);

    useEffect(() => {
        drawPreview();
    }, [drawPreview]);

    const renderOutput = async () => {
        const src = sourceRef.current;
        if (!src?.image || !imageSize) throw new Error("Load an image first.");
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        renderToCanvas(canvas, ctx);
        await waitFrame();
        const mime = exportFormat === "jpg" ? "image/jpeg" : "image/png";
        return canvasToBlob(canvas, mime, exportFormat === "jpg" ? quality / 100 : undefined);
    };

    const handleDownload = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        setProgress(50);
        setError("");
        try {
            const blob = await renderOutput();
            triggerDownload(blob, replaceExtension(file?.name || "image", exportFormat));
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
                    accept={ACCEPT}
                    className="img-tool__dropzone-input"
                    disabled={isProcessing}
                    onChange={(e) => e.target.files?.[0] && ingestFile(e.target.files[0])}
                />
                <p className="img-tool__dropzone-text">Drop PNG, JPG, or WEBP (max 30 MB)</p>
            </label>
            {file && imageSize ? (
                <div className="img-tool__meta">
                    <span className="img-tool__chip"><strong>{file.name}</strong></span>
                    <span className="img-tool__chip">{imageSize.width}×{imageSize.height}</span>
                    <span className="img-tool__chip">{formatBytes(file.size)}</span>
                </div>
            ) : null}
            <div>
                <span className="img-tool__label">Preset</span>
                <div className="img-tool__segmented" style={{ flexWrap: "wrap" }}>
                    {Object.entries(PRESETS).map(([key, { label }]) => (
                        <button
                            key={key}
                            type="button"
                            className={`img-tool__segment${preset === key ? " is-active" : ""}`}
                            disabled={!imageSize}
                            onClick={() => setPreset(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            {preset === "duotone" ? (
                <>
                    <div>
                        <label className="img-tool__label">Shadow color</label>
                        <div className="img-tool__color-row">
                            <input
                                type="color"
                                className="img-tool__color-input"
                                value={duoA}
                                disabled={!imageSize}
                                onChange={(e) => setDuoA(e.target.value)}
                            />
                            <input
                                className="img-tool__input"
                                value={duoA}
                                disabled={!imageSize}
                                onChange={(e) => setDuoA(normalizeHexColor(e.target.value, duoA))}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="img-tool__label">Highlight color</label>
                        <div className="img-tool__color-row">
                            <input
                                type="color"
                                className="img-tool__color-input"
                                value={duoB}
                                disabled={!imageSize}
                                onChange={(e) => setDuoB(e.target.value)}
                            />
                            <input
                                className="img-tool__input"
                                value={duoB}
                                disabled={!imageSize}
                                onChange={(e) => setDuoB(normalizeHexColor(e.target.value, duoB))}
                            />
                        </div>
                    </div>
                </>
            ) : null}
            <div>
                <label className="img-tool__label">Intensity ({intensity}%)</label>
                <input
                    className="img-tool__range"
                    type="range"
                    min={0}
                    max={100}
                    value={intensity}
                    disabled={!imageSize}
                    onChange={(e) => setIntensity(Number(e.target.value))}
                />
            </div>
            <div>
                <span className="img-tool__label">Export format</span>
                <div className="img-tool__segmented">
                    {["png", "jpg"].map((f) => (
                        <button
                            key={f}
                            type="button"
                            className={`img-tool__segment${exportFormat === f ? " is-active" : ""}`}
                            disabled={!imageSize}
                            onClick={() => setExportFormat(f)}
                        >
                            {f.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>
            {exportFormat === "jpg" ? (
                <div>
                    <label className="img-tool__label">Quality ({quality}%)</label>
                    <input
                        className="img-tool__range"
                        type="range"
                        min={1}
                        max={100}
                        value={quality}
                        disabled={!imageSize}
                        onChange={(e) => setQuality(Number(e.target.value))}
                    />
                </div>
            ) : null}
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
                <canvas ref={canvasRef} className="img-tool__preview-canvas" />
            ) : (
                <p className="img-tool__preview-empty">Upload an image to apply filters</p>
            )}
        </div>
    );

    return (
        <ImageToolWorkspace
            title="Filters & Effects"
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

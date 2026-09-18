import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import {
    MB,
    formatBytes,
    validateFile,
    loadImageFromFileWithProgress,
    canvasToBlob,
    triggerDownload,
    copyBlobToClipboard,
    replaceExtension,
    normalizeHexColor,
    waitFrame,
    preventDragDefaults,
} from "../_shared/imageToolUtils";

const MAX_BYTES = 30 * MB;
const ACCEPT = "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp";

const PRESET_CATEGORIES = {
    cinematic: {
        label: "Cinematic / Color",
        presets: {
            vintage: {
                label: "Vintage",
                type: "css",
                filter: "sepia(35%) contrast(108%) brightness(102%) saturate(115%) hue-rotate(-8deg)",
            },
            tealOrange: { label: "Teal & Orange", type: "pixel", effect: "tealOrange" },
            cinematic: {
                label: "Cinematic",
                type: "css",
                filter: "contrast(118%) saturate(88%) brightness(96%) sepia(12%)",
            },
            warm: {
                label: "Warm",
                type: "css",
                filter: "sepia(28%) saturate(135%) brightness(104%) hue-rotate(-6deg)",
            },
            cool: {
                label: "Cool",
                type: "css",
                filter: "saturate(90%) brightness(102%) hue-rotate(18deg) contrast(105%)",
            },
            fade: {
                label: "Fade",
                type: "css",
                filter: "contrast(88%) brightness(112%) saturate(78%)",
            },
        },
    },
    monochrome: {
        label: "B&W / Monochrome",
        presets: {
            grayscale: { label: "Classic B&W", type: "css", filter: "grayscale(100%)" },
            hcbw: { label: "High Contrast", type: "css", filter: "grayscale(100%) contrast(165%)" },
            sepia: { label: "Sepia", type: "css", filter: "sepia(100%)" },
            cyanotype: { label: "Cyanotype", type: "pixel", effect: "cyanotype" },
        },
    },
    artistic: {
        label: "Artistic / Distortion",
        presets: {
            duotone: { label: "Duotone", type: "duotone" },
            posterize: { label: "Posterize", type: "pixel", effect: "posterize" },
            pixelate: { label: "Pixelate", type: "pixel", effect: "pixelate" },
            vignette: { label: "Vignette", type: "pixel", effect: "vignette" },
            noise: { label: "Noise / Grain", type: "pixel", effect: "noise" },
            invert: { label: "Invert", type: "css", filter: "invert(100%)" },
            technicolor: {
                label: "Technicolor",
                type: "css",
                filter: "saturate(185%) contrast(118%) hue-rotate(-12deg) brightness(102%)",
            },
        },
    },
};

const DEFAULT_CATEGORY = "cinematic";
const DEFAULT_PRESET = "vintage";

function getPresetDef(presetKey) {
    for (const category of Object.values(PRESET_CATEGORIES)) {
        if (category.presets[presetKey]) return category.presets[presetKey];
    }
    return null;
}

function getCategoryForPreset(presetKey) {
    for (const [catKey, category] of Object.entries(PRESET_CATEGORIES)) {
        if (category.presets[presetKey]) return catKey;
    }
    return DEFAULT_CATEGORY;
}

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

function blendChannel(source, target, t) {
    return Math.round(source + (target - source) * t);
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
        data[i] = blendChannel(r, nr, t);
        data[i + 1] = blendChannel(g, ng, t);
        data[i + 2] = blendChannel(bch, nb, t);
    }
    return imageData;
}

function applyCyanotype(imageData, intensity) {
    const t = intensity / 100;
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const cr = lum * 0.12 + 18;
        const cg = lum * 0.42 + 55;
        const cb = Math.min(255, lum * 0.95 + 85);
        data[i] = blendChannel(r, cr, t);
        data[i + 1] = blendChannel(g, cg, t);
        data[i + 2] = blendChannel(b, cb, t);
    }
    return imageData;
}

function applyTealOrange(imageData, intensity) {
    const t = intensity / 100;
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const shadow = { r: 8, g: 72, b: 88 };
        const highlight = { r: 245, g: 148, b: 72 };
        const nr = shadow.r * (1 - lum) + highlight.r * lum;
        const ng = shadow.g * (1 - lum) + highlight.g * lum;
        const nb = shadow.b * (1 - lum) + highlight.b * lum;
        data[i] = blendChannel(r, nr, t);
        data[i + 1] = blendChannel(g, ng, t);
        data[i + 2] = blendChannel(b, nb, t);
    }
    return imageData;
}

function applyPosterize(imageData, intensity) {
    const levels = Math.max(3, Math.round(3 + (intensity / 100) * 9));
    const step = 255 / (levels - 1);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.round(data[i] / step) * step;
        data[i + 1] = Math.round(data[i + 1] / step) * step;
        data[i + 2] = Math.round(data[i + 2] / step) * step;
    }
    return imageData;
}

function applyVignette(imageData, intensity, width, height) {
    const t = intensity / 100;
    const cx = width / 2;
    const cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    const data = imageData.data;
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const i = (y * width + x) * 4;
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
            const darken = 1 - Math.pow(dist, 1.6) * t * 0.85;
            data[i] = Math.round(data[i] * darken);
            data[i + 1] = Math.round(data[i + 1] * darken);
            data[i + 2] = Math.round(data[i + 2] * darken);
        }
    }
    return imageData;
}

function applyNoise(imageData, intensity) {
    const amount = (intensity / 100) * 42;
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const grain = (Math.random() - 0.5) * amount;
        data[i] = Math.max(0, Math.min(255, Math.round(data[i] + grain)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(data[i + 1] + grain)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(data[i + 2] + grain)));
    }
    return imageData;
}

function drawPixelate(ctx, image, w, h, intensity) {
    const block = Math.max(3, Math.round(3 + (intensity / 100) * 28));
    const sw = Math.max(1, Math.ceil(w / block));
    const sh = Math.max(1, Math.ceil(h / block));
    const temp = document.createElement("canvas");
    temp.width = sw;
    temp.height = sh;
    const tctx = temp.getContext("2d");
    tctx.drawImage(image, 0, 0, sw, sh);
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(temp, 0, 0, sw, sh, 0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
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

function applyPixelEffect(imageData, effect, intensity, width, height) {
    switch (effect) {
        case "cyanotype":
            return applyCyanotype(imageData, intensity);
        case "tealOrange":
            return applyTealOrange(imageData, intensity);
        case "posterize":
            return applyPosterize(imageData, intensity);
        case "vignette":
            return applyVignette(imageData, intensity, width, height);
        case "noise":
            return applyNoise(imageData, intensity);
        default:
            return imageData;
    }
}

export default function FiltersEffectsTool() {
    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    const sourceRef = useRef(null);
    const operationRef = useRef(0);

    const [file, setFile] = useState(null);
    const [imageSize, setImageSize] = useState(null);
    const [activeCategory, setActiveCategory] = useState(DEFAULT_CATEGORY);
    const [preset, setPreset] = useState(DEFAULT_PRESET);
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
        setActiveCategory(DEFAULT_CATEGORY);
        setPreset(DEFAULT_PRESET);
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

    const handleCategoryChange = (categoryKey) => {
        setActiveCategory(categoryKey);
        const firstPreset = Object.keys(PRESET_CATEGORIES[categoryKey].presets)[0];
        if (!PRESET_CATEGORIES[categoryKey].presets[preset]) {
            setPreset(firstPreset);
        }
    };

    const renderToCanvas = useCallback(
        (canvas, ctx) => {
            const src = sourceRef.current;
            if (!src?.image || !imageSize) return;
            const { width, height } = imageSize;
            canvas.width = width;
            canvas.height = height;
            const presetDef = getPresetDef(preset);
            if (!presetDef) return;

            ctx.filter = "none";

            if (presetDef.type === "css") {
                drawWithFilterIntensity(ctx, src.image, width, height, presetDef.filter, intensity);
            } else if (presetDef.type === "duotone") {
                ctx.drawImage(src.image, 0, 0);
                const imageData = ctx.getImageData(0, 0, width, height);
                ctx.putImageData(applyDuotone(imageData, duoA, duoB, intensity), 0, 0);
            } else if (presetDef.effect === "pixelate") {
                ctx.drawImage(src.image, 0, 0);
                if (intensity > 0) {
                    drawPixelate(ctx, src.image, width, height, intensity);
                }
            } else {
                ctx.drawImage(src.image, 0, 0);
                if (intensity > 0) {
                    const imageData = ctx.getImageData(0, 0, width, height);
                    ctx.putImageData(
                        applyPixelEffect(imageData, presetDef.effect, intensity, width, height),
                        0,
                        0,
                    );
                }
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

    const activePresets = PRESET_CATEGORIES[activeCategory].presets;

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
                <span className="img-tool__label">Filter category</span>
                <div className="img-tool__tabs">
                    {Object.entries(PRESET_CATEGORIES).map(([key, { label }]) => (
                        <button
                            key={key}
                            type="button"
                            className={`img-tool__tab${activeCategory === key ? " is-active" : ""}`}
                            disabled={!imageSize}
                            onClick={() => handleCategoryChange(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <span className="img-tool__label">Preset</span>
                <div className="img-tool__segmented" style={{ flexWrap: "wrap" }}>
                    {Object.entries(activePresets).map(([key, { label }]) => (
                        <button
                            key={key}
                            type="button"
                            className={`img-tool__segment${preset === key ? " is-active" : ""}`}
                            disabled={!imageSize}
                            onClick={() => {
                                setPreset(key);
                                setActiveCategory(getCategoryForPreset(key));
                            }}
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
                <div className="img-tool__range-meta">
                    <span>0%</span>
                    <span className="img-tool__range-value">{intensity}%</span>
                    <span>100%</span>
                </div>
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

import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import ImageToolRange from "../_shared/ImageToolRange";
import {MB,
    formatBytes,
    validateFile,
    loadImageFromFileWithProgress,
    canvasToBlob,
    triggerDownload,
    copyBlobToClipboard,
    replaceExtension,
    clamp,
    waitFrame, preventDragDefaults } from "../_shared/imageToolUtils";
// preventDragDefaults imported below

const MAX_BYTES = 30 * MB;
const MAX_OUTPUT = 8192;
const ACCEPT = "image/png,image/jpeg,image/webp,image/bmp,.png,.jpg,.jpeg,.webp,.bmp";
const ASPECT_PRESETS = {
    freeform: null,
    "1:1": 1,
    "16:9": 16 / 9,
    "4:5": 4 / 5,
    "9:16": 9 / 16,
};

const SOCIAL_PRESETS = {
    youtube: { label: "YouTube Thumbnail", width: 1280, height: 720, ratio: 16 / 9 },
    twitter: { label: "Twitter Header", width: 1500, height: 500, ratio: 3 },
    facebook: { label: "Facebook Cover", width: 820, height: 312, ratio: 820 / 312 },
    linkedin: { label: "LinkedIn Banner", width: 1584, height: 396, ratio: 4 },
};
const MIME_BY_FORMAT = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

function validateCropResizeFile(file) {
    return validateFile(file, {
        maxBytes: MAX_BYTES,
        extensions: [/\.(png|jpe?g|webp|bmp)$/i],
        mimes: new Set(["image/png", "image/jpeg", "image/webp", "image/bmp"]),
        sizeMessage: "File exceeds 30 MB limit.",
        typeMessage: "Unsupported file type. Please upload PNG, JPG, WEBP, or BMP.",
    });
}

function clampCrop(crop, imgW, imgH) {
    const w = clamp(crop.w, 1, imgW);
    const h = clamp(crop.h, 1, imgH);
    const x = clamp(crop.x, 0, imgW - w);
    const y = clamp(crop.y, 0, imgH - h);
    return { x, y, w, h };
}

function getFixedPoint(crop, handle) {
    const { x, y, w, h } = crop;
    if (handle === "nw") return { fx: x + w, fy: y + h };
    if (handle === "ne") return { fx: x, fy: y + h };
    if (handle === "sw") return { fx: x + w, fy: y };
    if (handle === "se") return { fx: x, fy: y };
    return { fx: x + w / 2, fy: y + h / 2 };
}

function applyAspectToCrop(nextCrop, ratio, handle = "center") {
    if (!ratio) return nextCrop;

    let { w, h } = nextCrop;
    w = Math.max(1, w);
    h = Math.max(1, h);

    if (w / h > ratio) h = w / ratio;
    else w = h * ratio;

    const { fx, fy } = getFixedPoint(nextCrop, handle);
    let x;
    let y;

    if (handle === "nw") {
        x = fx - w;
        y = fy - h;
    } else if (handle === "ne") {
        x = fx;
        y = fy - h;
    } else if (handle === "sw") {
        x = fx - w;
        y = fy;
    } else if (handle === "se") {
        x = fx;
        y = fy;
    } else {
        x = fx - w / 2;
        y = fy - h / 2;
    }

    return { x, y, w, h };
}

function clampCropWithAspect(crop, imgW, imgH, ratio = null, handle = "center") {
    if (!ratio) return clampCrop(crop, imgW, imgH);

    const maxW = Math.min(imgW, imgH * ratio);
    const maxH = maxW / ratio;
    let next = applyAspectToCrop(crop, ratio, handle);

    if (next.w > maxW || next.h > maxH) {
        const scale = Math.min(maxW / next.w, maxH / next.h, 1);
        next = applyAspectToCrop(
            { ...next, w: Math.max(1, next.w * scale), h: Math.max(1, next.h * scale) },
            ratio,
            handle,
        );
    }

    let { x, y, w, h } = next;
    w = clamp(w, 1, maxW);
    h = clamp(h, 1, maxH);
    next = applyAspectToCrop({ x, y, w, h }, ratio, handle);
    ({ x, y, w, h } = next);
    x = clamp(x, 0, imgW - w);
    y = clamp(y, 0, imgH - h);

    return { x, y, w, h };
}

function fitCropToImage(crop, imgW, imgH, ratio = null, handle = "center") {
    return clampCropWithAspect(
        ratio ? applyAspectToCrop(crop, ratio, handle) : crop,
        imgW,
        imgH,
        ratio,
        handle,
    );
}

function fitOutputSize(width, height, maxDim = MAX_OUTPUT) {
    const scale = Math.min(1, maxDim / Math.max(width, height));
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    };
}

export default function CropResizeTool() {
    const fileInputRef = useRef(null);
    const previewCanvasRef = useRef(null);
    const sourceRef = useRef(null);
    const operationRef = useRef(0);
    const dragRef = useRef(null);

    const [file, setFile] = useState(null);
    const [imageSize, setImageSize] = useState(null);
    const [mode, setMode] = useState("crop");
    const [aspectKey, setAspectKey] = useState("freeform");
    const [crop, setCrop] = useState({ x: 0, y: 0, w: 100, h: 100 });
    const [outWidth, setOutWidth] = useState("");
    const [outHeight, setOutHeight] = useState("");
    const [lockAspect, setLockAspect] = useState(true);
    const [scalePct, setScalePct] = useState(100);
    const [interpolation, setInterpolation] = useState("bicubic");
    const [exportFormat, setExportFormat] = useState("png");
    const [quality, setQuality] = useState(90);
    const [straightenAngle, setStraightenAngle] = useState(0);
    const [socialPreset, setSocialPreset] = useState("");
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState("");
    const [resultBlob, setResultBlob] = useState(null);

    const smooth = interpolation === "bicubic";

    const getActiveAspectRatio = useCallback(() => {
        if (socialPreset && SOCIAL_PRESETS[socialPreset]) {
            return SOCIAL_PRESETS[socialPreset].ratio;
        }
        return ASPECT_PRESETS[aspectKey];
    }, [socialPreset, aspectKey]);

    const releaseSource = useCallback(() => {
        if (sourceRef.current?.objectUrl) URL.revokeObjectURL(sourceRef.current.objectUrl);
        sourceRef.current = null;
    }, []);

    const revokePreview = useCallback(() => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl("");
    }, [previewUrl]);

    const resetAll = useCallback(() => {
        operationRef.current += 1;
        releaseSource();
        revokePreview();
        setFile(null);
        setImageSize(null);
        setCrop({ x: 0, y: 0, w: 100, h: 100 });
        setOutWidth("");
        setOutHeight("");
        setScalePct(100);
        setStraightenAngle(0);
        setSocialPreset("");
        setError("");
        setStatus("");
        setProgress(0);
        setResultBlob(null);
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [releaseSource, revokePreview]);

    const applyAspectToCropForImage = useCallback(
        (nextCrop, ratio, handle = "center") =>
            fitCropToImage(nextCrop, imageSize.width, imageSize.height, ratio, handle),
        [imageSize],
    );

    const ingestFile = useCallback(
        async (nextFile) => {
            const validation = validateCropResizeFile(nextFile);
            if (!validation.ok) {
                setError(validation.error);
                return;
            }
            const op = operationRef.current + 1;
            operationRef.current = op;
            releaseSource();
            revokePreview();
            setError("");
            setStatus("");
            setResultBlob(null);
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
                const size = { width: loaded.width, height: loaded.height };
                setImageSize(size);
                const initial = { x: 0, y: 0, w: size.width, h: size.height };
                setCrop(initial);
                setOutWidth(String(size.width));
                setOutHeight(String(size.height));
            } catch (e) {
                if (operationRef.current === op) setError(e.message || "Failed to load image.");
            } finally {
                if (operationRef.current === op) {
                    setIsProcessing(false);
                    setProgress(0);
                }
            }
        },
        [releaseSource, revokePreview],
    );

    const getDisplayScale = useCallback(() => {
        const canvas = previewCanvasRef.current;
        if (!canvas || !imageSize) return 1;
        const pad = 8;
        const maxW = canvas.clientWidth - pad * 2;
        const maxH = canvas.clientHeight - pad * 2;
        return Math.min(maxW / imageSize.width, maxH / imageSize.height, 1);
    }, [imageSize]);

    const drawPreview = useCallback(() => {
        const canvas = previewCanvasRef.current;
        const src = sourceRef.current;
        if (!canvas || !src?.image || !imageSize) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);
        const scale = getDisplayScale();
        const ox = (rect.width - imageSize.width * scale) / 2;
        const oy = (rect.height - imageSize.height * scale) / 2;
        const cx = ox + (imageSize.width * scale) / 2;
        const cy = oy + (imageSize.height * scale) / 2;
        const rad = (straightenAngle * Math.PI) / 180;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rad);
        ctx.drawImage(
            src.image,
            (-imageSize.width * scale) / 2,
            (-imageSize.height * scale) / 2,
            imageSize.width * scale,
            imageSize.height * scale,
        );
        ctx.restore();

        if (mode !== "resize") {
            const { x, y, w, h } = crop;
            ctx.save();
            ctx.fillStyle = "rgba(0,0,0,0.45)";
            ctx.fillRect(ox, oy, imageSize.width * scale, imageSize.height * scale);
            ctx.translate(cx, cy);
            ctx.rotate(rad);
            ctx.clearRect(
                -imageSize.width * scale / 2 + x * scale,
                -imageSize.height * scale / 2 + y * scale,
                w * scale,
                h * scale,
            );
            ctx.drawImage(
                src.image,
                x,
                y,
                w,
                h,
                -imageSize.width * scale / 2 + x * scale,
                -imageSize.height * scale / 2 + y * scale,
                w * scale,
                h * scale,
            );
            ctx.strokeStyle = "#10b981";
            ctx.lineWidth = 2;
            ctx.strokeRect(
                -imageSize.width * scale / 2 + x * scale,
                -imageSize.height * scale / 2 + y * scale,
                w * scale,
                h * scale,
            );
            const hs = 8;
            [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([px, py]) => {
                ctx.fillStyle = "#10b981";
                ctx.fillRect(
                    -imageSize.width * scale / 2 + px * scale - hs / 2,
                    -imageSize.height * scale / 2 + py * scale - hs / 2,
                    hs,
                    hs,
                );
            });
            ctx.restore();
        }
    }, [crop, getDisplayScale, imageSize, mode, straightenAngle]);

    useEffect(() => {
        drawPreview();
    }, [drawPreview, crop, mode, imageSize]);

    useEffect(() => {
        const onResize = () => drawPreview();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [drawPreview]);

    const canvasToImageCoords = (clientX, clientY) => {
        const canvas = previewCanvasRef.current;
        if (!canvas || !imageSize) return null;
        const rect = canvas.getBoundingClientRect();
        const scale = getDisplayScale();
        const ox = (rect.width - imageSize.width * scale) / 2;
        const oy = (rect.height - imageSize.height * scale) / 2;
        const x = (clientX - rect.left - ox) / scale;
        const y = (clientY - rect.top - oy) / scale;
        return { x, y };
    };

    const handleCanvasMouseDown = (e) => {
        if (!imageSize || mode === "resize") return;
        const pt = canvasToImageCoords(e.clientX, e.clientY);
        if (!pt) return;
        const { x, y, w, h } = crop;
        const handle = 12 / getDisplayScale();
        const corners = {
            nw: { x, y },
            ne: { x: x + w, y },
            sw: { x, y: y + h },
            se: { x: x + w, y: y + h },
        };
        let modeDrag = "move";
        for (const [key, c] of Object.entries(corners)) {
            if (Math.abs(pt.x - c.x) < handle && Math.abs(pt.y - c.y) < handle) {
                modeDrag = key;
                break;
            }
        }
        if (
            modeDrag === "move" &&
            (pt.x < x || pt.x > x + w || pt.y < y || pt.y > y + h)
        ) {
            return;
        }
        dragRef.current = { mode: modeDrag, startPt: pt, startCrop: { ...crop } };
    };

    const handleCanvasMouseMove = (e) => {
        const drag = dragRef.current;
        if (!drag || !imageSize) return;
        const pt = canvasToImageCoords(e.clientX, e.clientY);
        if (!pt) return;
        const dx = pt.x - drag.startPt.x;
        const dy = pt.y - drag.startPt.y;
        let next = { ...drag.startCrop };
        const ratio = getActiveAspectRatio();
        if (drag.mode === "move") {
            next.x += dx;
            next.y += dy;
            next = clampCropWithAspect(next, imageSize.width, imageSize.height, ratio, "center");
        } else {
            if (drag.mode.includes("n")) {
                next.y += dy;
                next.h -= dy;
            }
            if (drag.mode.includes("s")) next.h += dy;
            if (drag.mode.includes("w")) {
                next.x += dx;
                next.w -= dx;
            }
            if (drag.mode.includes("e")) next.w += dx;
            if (next.w < 1) next.w = 1;
            if (next.h < 1) next.h = 1;
            if (ratio) {
                next = clampCropWithAspect(next, imageSize.width, imageSize.height, ratio, drag.mode);
            } else {
                next = clampCrop(next, imageSize.width, imageSize.height);
            }
        }
        setCrop(next);
    };

    const handleCanvasMouseUp = () => {
        dragRef.current = null;
    };

    useEffect(() => {
        window.addEventListener("mousemove", handleCanvasMouseMove);
        window.addEventListener("mouseup", handleCanvasMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleCanvasMouseMove);
            window.removeEventListener("mouseup", handleCanvasMouseUp);
        };
    });

    const handleAspectChange = (key) => {
        setAspectKey(key);
        setSocialPreset("");
        const ratio = ASPECT_PRESETS[key];
        if (ratio && imageSize) setCrop((c) => applyAspectToCropForImage(c, ratio, "center"));
    };

    const handleSocialPreset = (key) => {
        if (socialPreset === key) {
            setSocialPreset("");
            setAspectKey("freeform");
            return;
        }

        const preset = SOCIAL_PRESETS[key];
        if (!preset || !imageSize) return;
        setSocialPreset(key);
        setMode("both");
        setLockAspect(true);
        setAspectKey("freeform");
        setCrop((c) => applyAspectToCropForImage(c, preset.ratio, "center"));
        setOutWidth(String(preset.width));
        setOutHeight(String(preset.height));
    };

    const handleWidthChange = (val) => {
        setOutWidth(val);
        const w = parseInt(val, 10);
        if (!lockAspect || !imageSize || !w) return;
        const ratio = crop.w / crop.h;
        setOutHeight(String(Math.round(w / ratio)));
    };

    const handleHeightChange = (val) => {
        setOutHeight(val);
        const h = parseInt(val, 10);
        if (!lockAspect || !imageSize || !h) return;
        const ratio = crop.w / crop.h;
        setOutWidth(String(Math.round(h * ratio)));
    };

    const computeOutputDimensions = () => {
        if (!imageSize) return null;
        let sw = imageSize.width;
        let sh = imageSize.height;
        if (mode !== "resize") {
            sw = crop.w;
            sh = crop.h;
        }
        let dw = parseInt(outWidth, 10) || sw;
        let dh = parseInt(outHeight, 10) || sh;
        if (mode === "crop") {
            dw = Math.round(sw * (scalePct / 100));
            dh = Math.round(sh * (scalePct / 100));
        } else if (mode === "resize" || mode === "both") {
            if (!outWidth && !outHeight) {
                dw = Math.round(sw * (scalePct / 100));
                dh = Math.round(sh * (scalePct / 100));
            }
        }
        return fitOutputSize(dw, dh);
    };

    const renderOutput = async () => {
        const src = sourceRef.current;
        if (!src?.image || !imageSize) throw new Error("Load an image first.");
        const { width: dw, height: dh } = computeOutputDimensions();
        const canvas = document.createElement("canvas");
        canvas.width = dw;
        canvas.height = dh;
        const ctx = canvas.getContext("2d");
        let sx = 0;
        let sy = 0;
        let sw = imageSize.width;
        let sh = imageSize.height;
        if (mode !== "resize") {
            sx = crop.x;
            sy = crop.y;
            sw = crop.w;
            sh = crop.h;
        }
        const rad = (straightenAngle * Math.PI) / 180;
        ctx.save();
        ctx.translate(dw / 2, dh / 2);
        ctx.rotate(rad);
        ctx.imageSmoothingEnabled = smooth;
        if (smooth) ctx.imageSmoothingQuality = "high";
        ctx.drawImage(src.image, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
        await waitFrame();
        const mime = MIME_BY_FORMAT[exportFormat];
        const q = exportFormat === "png" ? undefined : quality / 100;
        return canvasToBlob(canvas, mime, q);
    };

    const handleApply = async () => {
        setError("");
        setStatus("");
        setIsProcessing(true);
        setProgress(30);
        try {
            const blob = await renderOutput();
            setProgress(90);
            revokePreview();
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            setResultBlob(blob);
            setStatus("Preview updated. Download or copy the result.");
            setProgress(100);
        } catch (e) {
            setError(e.message || "Export failed.");
        } finally {
            setIsProcessing(false);
            setTimeout(() => setProgress(0), 400);
        }
    };

    const handleDownload = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        setProgress(40);
        try {
            const blob = resultBlob || await renderOutput();
            const ext = exportFormat === "jpg" ? "jpg" : exportFormat;
            triggerDownload(blob, replaceExtension(file?.name || "image", ext));
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
        try {
            const blob = resultBlob || await renderOutput();
            await copyBlobToClipboard(blob);
            setStatus("Copied to clipboard.");
        } catch (e) {
            setError(e.message || "Copy failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    const outDims = computeOutputDimensions();

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
                <p className="img-tool__dropzone-text">
                    Drop PNG, JPG, WEBP, or BMP (max 30 MB)
                    <br />
                    or click to browse
                </p>
            </label>
            {file && imageSize ? (
                <div className="img-tool__meta">
                    <span className="img-tool__chip">
                        <strong>{file.name}</strong>
                    </span>
                    <span className="img-tool__chip">
                        {imageSize.width}×{imageSize.height}
                    </span>
                    <span className="img-tool__chip">{formatBytes(file.size)}</span>
                </div>
            ) : null}
            <div className="img-tool__controls-scroll">
            <div>
                <span className="img-tool__label">Mode</span>
                <div className="img-tool__segmented">
                    {["crop", "resize", "both"].map((m) => (
                        <button
                            key={m}
                            type="button"
                            className={`img-tool__segment${mode === m ? " is-active" : ""}`}
                            disabled={!imageSize}
                            onClick={() => setMode(m)}
                        >
                            {m === "crop" ? "Crop" : m === "resize" ? "Resize" : "Both"}
                        </button>
                    ))}
                </div>
            </div>
            {mode !== "resize" ? (
                <div>
                    <span className="img-tool__label">Aspect ratio</span>
                    <div className="img-tool__segmented">
                        {Object.keys(ASPECT_PRESETS).map((key) => (
                            <button
                                key={key}
                                type="button"
                                className={`img-tool__segment${aspectKey === key && !socialPreset ? " is-active" : ""}`}
                                disabled={!imageSize}
                                onClick={() => handleAspectChange(key)}
                            >
                                {key === "freeform"
                                    ? "Freeform"
                                    : key === "1:1"
                                      ? "1:1"
                                      : key}
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}
            {mode !== "resize" ? (
                <div>
                    <span className="img-tool__label">Social Media Presets</span>
                    <div className="img-tool__segmented" style={{ flexWrap: "wrap" }}>
                        {Object.entries(SOCIAL_PRESETS).map(([key, preset]) => (
                            <button
                                key={key}
                                type="button"
                                className={`img-tool__segment${socialPreset === key ? " is-active" : ""}`}
                                disabled={!imageSize}
                                onClick={() => handleSocialPreset(key)}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                    {socialPreset ? (
                        <p className="img-tool__hint">
                            Output: {SOCIAL_PRESETS[socialPreset].width}×{SOCIAL_PRESETS[socialPreset].height}px
                        </p>
                    ) : null}
                </div>
            ) : null}
            {mode !== "resize" ? (
                <ImageToolRange
                    id="crop-straighten"
                    label="Straighten"
                    min={-45}
                    max={45}
                    step={0.1}
                    value={straightenAngle}
                    disabled={!imageSize}
                    onChange={setStraightenAngle}
                    formatDisplay={(val) => `${val}°`}
                    lowLabel="-45°"
                    highLabel="45°"
                />
            ) : null}
            {(mode === "resize" || mode === "both") && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    <div>
                        <label className="img-tool__label">Width (px)</label>
                        <input
                            className="img-tool__input"
                            type="number"
                            min={1}
                            max={MAX_OUTPUT}
                            value={outWidth}
                            disabled={!imageSize}
                            onChange={(e) => handleWidthChange(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="img-tool__label">Height (px)</label>
                        <input
                            className="img-tool__input"
                            type="number"
                            min={1}
                            max={MAX_OUTPUT}
                            value={outHeight}
                            disabled={!imageSize}
                            onChange={(e) => handleHeightChange(e.target.value)}
                        />
                    </div>
                </div>
            )}
            <div>
                <button
                    type="button"
                    className={`img-tool__btn${lockAspect ? " img-tool__btn--primary" : ""}`}
                    disabled={!imageSize}
                    onClick={() => setLockAspect((v) => !v)}
                >
                    {lockAspect ? "Aspect locked" : "Aspect unlocked"}
                </button>
            </div>
            <ImageToolRange
                label="Scale"
                min={10}
                max={200}
                value={scalePct}
                disabled={!imageSize}
                onChange={setScalePct}
                unit="%"
            />
            <div>
                <span className="img-tool__label">Interpolation</span>
                <div className="img-tool__segmented">
                    <button
                        type="button"
                        className={`img-tool__segment${interpolation === "bicubic" ? " is-active" : ""}`}
                        disabled={!imageSize}
                        onClick={() => setInterpolation("bicubic")}
                    >
                        Bicubic
                    </button>
                    <button
                        type="button"
                        className={`img-tool__segment${interpolation === "nearest" ? " is-active" : ""}`}
                        disabled={!imageSize}
                        onClick={() => setInterpolation("nearest")}
                    >
                        Nearest
                    </button>
                </div>
            </div>
            <div>
                <span className="img-tool__label">Export format</span>
                <div className="img-tool__segmented">
                    {["png", "jpg", "webp"].map((f) => (
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
            {exportFormat !== "png" ? (
                <ImageToolRange
                    label="Quality"
                    min={1}
                    max={100}
                    value={quality}
                    disabled={!imageSize}
                    onChange={setQuality}
                    unit="%"
                />
            ) : null}
            {outDims ? (
                <p className="img-tool__hint">
                    Output: {outDims.width}×{outDims.height}px (max {MAX_OUTPUT}px)
                </p>
            ) : null}
            </div>
            <div className="img-tool__actions">
                <button
                    type="button"
                    className="img-tool__btn img-tool__btn--primary"
                    disabled={!imageSize || isProcessing}
                    onClick={handleApply}
                >
                    Apply
                </button>
                <button
                    type="button"
                    className="img-tool__btn"
                    disabled={!imageSize || isProcessing}
                    onClick={handleDownload}
                >
                    Download
                </button>
                <button
                    type="button"
                    className="img-tool__btn"
                    disabled={!imageSize || isProcessing}
                    onClick={handleCopy}
                >
                    Copy
                </button>
                <button
                    type="button"
                    className="img-tool__btn"
                    disabled={!imageSize || isProcessing}
                    onClick={resetAll}
                >
                    Reset
                </button>
            </div>
        </>
    );

    const right = (
        <>
            <div className="img-tool__preview-frame" style={{ maxHeight: "min(50vh, 380px)" }}>
                {imageSize ? (
                    <canvas
                        ref={previewCanvasRef}
                        className="img-tool__preview-canvas"
                        style={{ width: "100%", height: "min(50vh, 380px)", cursor: mode === "resize" ? "default" : "crosshair" }}
                        onMouseDown={handleCanvasMouseDown}
                    />
                ) : previewUrl ? (
                    <img src={previewUrl} alt="Result preview" className="img-tool__preview-image" />
                ) : (
                    <p className="img-tool__preview-empty">Upload an image to crop or resize</p>
                )}
            </div>
            {previewUrl && imageSize ? (
                <div className="img-tool__preview-frame" style={{ maxHeight: "200px" }}>
                    <img src={previewUrl} alt="Applied result" className="img-tool__preview-image" />
                </div>
            ) : null}
        </>
    );

    return (
        <ImageToolWorkspace
            title="Crop & Resize"
            error={error}
            status={status}
            left={left}
            right={right}
            showProgress={isProcessing || progress > 0}
            progress={progress}
            progressLabel="Processing image"
        />
    );
}

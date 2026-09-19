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
    waitFrame, preventDragDefaults } from "../_shared/imageToolUtils";
// preventDragDefaults imported below

const MAX_BYTES = 30 * MB;
const ACCEPT = "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp";

function validateRotateFile(file) {
    return validateFile(file, {
        maxBytes: MAX_BYTES,
        extensions: [/\.(png|jpe?g|webp)$/i],
        mimes: new Set(["image/png", "image/jpeg", "image/webp"]),
        sizeMessage: "File exceeds 30 MB limit.",
        typeMessage: "Unsupported file type. Please upload PNG, JPG, or WEBP.",
    });
}

function degToRad(d) {
    return (d * Math.PI) / 180;
}

function computeRotatedBounds(w, h, angleDeg, flipH, flipV) {
    const rad = degToRad(angleDeg);
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    return {
        width: Math.ceil(w * cos + h * sin),
        height: Math.ceil(w * sin + h * cos),
    };
}

function drawTransformedImage(ctx, image, w, h, angleDeg, flipH, flipV, autoCrop) {
    const rad = degToRad(angleDeg);
    const bounds = computeRotatedBounds(w, h, angleDeg, flipH, flipV);
    const cw = autoCrop ? bounds.width : Math.max(w, bounds.width);
    const ch = autoCrop ? bounds.height : Math.max(h, bounds.height);
    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.translate(cw / 2, ch / 2);
    ctx.rotate(rad);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(image, -w / 2, -h / 2, w, h);
    ctx.restore();
    return { width: cw, height: ch };
}

export default function RotateFlipTool() {
    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    const sourceRef = useRef(null);
    const operationRef = useRef(0);

    const [file, setFile] = useState(null);
    const [imageSize, setImageSize] = useState(null);
    const [baseRotation, setBaseRotation] = useState(0);
    const [fineRotation, setFineRotation] = useState(0);
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);
    const [autoCrop, setAutoCrop] = useState(true);
    const [exportFormat, setExportFormat] = useState("png");
    const [quality, setQuality] = useState(90);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const totalRotation = baseRotation + fineRotation;

    const releaseSource = useCallback(() => {
        if (sourceRef.current?.objectUrl) URL.revokeObjectURL(sourceRef.current.objectUrl);
        sourceRef.current = null;
    }, []);

    const resetAll = useCallback(() => {
        operationRef.current += 1;
        releaseSource();
        setFile(null);
        setImageSize(null);
        setBaseRotation(0);
        setFineRotation(0);
        setFlipH(false);
        setFlipV(false);
        setAutoCrop(true);
        setError("");
        setStatus("");
        setProgress(0);
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [releaseSource]);

    const ingestFile = useCallback(
        async (nextFile) => {
            const validation = validateRotateFile(nextFile);
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
                setBaseRotation(0);
                setFineRotation(0);
                setFlipH(false);
                setFlipV(false);
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

    const renderPreview = useCallback(() => {
        const canvas = canvasRef.current;
        const src = sourceRef.current;
        if (!canvas || !src?.image || !imageSize) return;
        const { width: w, height: h } = imageSize;
        const bounds = computeRotatedBounds(w, h, totalRotation, flipH, flipV);
        const cw = autoCrop ? bounds.width : Math.max(w, bounds.width);
        const ch = autoCrop ? bounds.height : Math.max(h, bounds.height);
        const dpr = window.devicePixelRatio || 1;
        const frame = canvas.parentElement?.getBoundingClientRect();
        const maxW = frame?.width || 400;
        const maxH = frame?.height || 300;
        const displayScale = Math.min(maxW / cw, maxH / ch, 1);
        canvas.style.width = `${cw * displayScale}px`;
        canvas.style.height = `${ch * displayScale}px`;
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawTransformedImage(ctx, src.image, w, h, totalRotation, flipH, flipV, autoCrop);
    }, [imageSize, totalRotation, flipH, flipV, autoCrop]);

    useEffect(() => {
        renderPreview();
    }, [renderPreview]);

    const rotate90 = (dir) => {
        setBaseRotation((r) => (r + dir * 90) % 360);
    };

    const renderOutput = async () => {
        const src = sourceRef.current;
        if (!src?.image || !imageSize) throw new Error("Load an image first.");
        const { width: w, height: h } = imageSize;
        const bounds = computeRotatedBounds(w, h, totalRotation, flipH, flipV);
        const cw = autoCrop ? bounds.width : Math.max(w, bounds.width);
        const ch = autoCrop ? bounds.height : Math.max(h, bounds.height);
        const canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext("2d");
        drawTransformedImage(ctx, src.image, w, h, totalRotation, flipH, flipV, autoCrop);
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
                <p className="img-tool__dropzone-text">
                    Drop PNG, JPG, or WEBP (max 30 MB)
                    <br />
                    or click to browse
                </p>
            </label>
            {file && imageSize ? (
                <div className="img-tool__meta">
                    <span className="img-tool__chip"><strong>{file.name}</strong></span>
                    <span className="img-tool__chip">{imageSize.width}×{imageSize.height}</span>
                    <span className="img-tool__chip">{formatBytes(file.size)}</span>
                </div>
            ) : null}
            <div>
                <span className="img-tool__label">Quick rotate</span>
                <div className="img-tool__actions" style={{ marginTop: 0 }}>
                    <button type="button" className="img-tool__btn" disabled={!imageSize} onClick={() => rotate90(1)}>
                        90° CW
                    </button>
                    <button type="button" className="img-tool__btn" disabled={!imageSize} onClick={() => rotate90(-1)}>
                        90° CCW
                    </button>
                    <button type="button" className="img-tool__btn" disabled={!imageSize} onClick={() => setBaseRotation((r) => r + 180)}>
                        180°
                    </button>
                </div>
            </div>
            <div>
                <span className="img-tool__label">Flip</span>
                <div className="img-tool__segmented">
                    <button
                        type="button"
                        className={`img-tool__segment${flipH ? " is-active" : ""}`}
                        disabled={!imageSize}
                        onClick={() => setFlipH((v) => !v)}
                    >
                        Horizontal
                    </button>
                    <button
                        type="button"
                        className={`img-tool__segment${flipV ? " is-active" : ""}`}
                        disabled={!imageSize}
                        onClick={() => setFlipV((v) => !v)}
                    >
                        Vertical
                    </button>
                </div>
            </div>
            <ImageToolRange
                label="Fine rotation"
                min={-45}
                max={45}
                step={0.1}
                value={fineRotation}
                disabled={!imageSize}
                onChange={setFineRotation}
                formatDisplay={(val) => `${val.toFixed(1)}°`}
                centerLabel={`Total: ${totalRotation.toFixed(1)}°`}
                lowLabel="-45°"
                highLabel="+45°"
            />
            <div>
                <button
                    type="button"
                    className={`img-tool__btn${autoCrop ? " img-tool__btn--primary" : ""}`}
                    disabled={!imageSize}
                    onClick={() => setAutoCrop((v) => !v)}
                >
                    {autoCrop ? "Auto-crop borders: On" : "Auto-crop borders: Off"}
                </button>
                <p className="img-tool__hint">Trims empty corners after fine rotation.</p>
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
                <p className="img-tool__preview-empty">Upload an image to rotate or flip</p>
            )}
        </div>
    );

    return (
        <ImageToolWorkspace
            title="Rotate & Flip"
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

import { useCallback, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import {MB,
    IMAGE_ACCEPT,
    formatBytes,
    validateStandardImage,
    loadImageFromFileWithProgress,
    canvasToBlob,
    triggerDownload,
    replaceExtension,
    waitFrame, preventDragDefaults } from "../_shared/imageToolUtils";
// preventDragDefaults imported below

const MAX_BYTES = 30 * MB;
const DEFAULTS = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    exposure: 0,
    temperature: 0,
};

function buildFilterString(values) {
    const { brightness, contrast, saturation, hue, exposure, temperature } = values;
    const b = 100 + brightness + exposure * 0.5;
    const c = 100 + contrast;
    const s = 100 + saturation;
    const warm = temperature > 0 ? `sepia(${Math.abs(temperature) * 0.4}%)` : "";
    const cool = temperature < 0 ? `hue-rotate(${temperature * 0.6}deg)` : "";
    return [
        `brightness(${b}%)`,
        `contrast(${c}%)`,
        `saturate(${s}%)`,
        `hue-rotate(${hue}deg)`,
        warm,
        cool,
    ]
        .filter(Boolean)
        .join(" ");
}

export default function ColorAdjustmentsTool() {
    const fileInputRef = useRef(null);
    const previewImgRef = useRef(null);
    const sourceRef = useRef(null);
    const previewUrlRef = useRef("");
    const operationRef = useRef(0);

    const [file, setFile] = useState(null);
    const [imageSize, setImageSize] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [values, setValues] = useState(DEFAULTS);
    const [viewMode, setViewMode] = useState("split");
    const [holdingOriginal, setHoldingOriginal] = useState(false);
    const [splitPos, setSplitPos] = useState(50);
    const [exportFormat, setExportFormat] = useState("png");
    const [quality, setQuality] = useState(90);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const filterCss = buildFilterString(values);
    const showOriginal = viewMode === "hold" && holdingOriginal;

    const releaseSource = useCallback(() => {
        if (sourceRef.current?.objectUrl) URL.revokeObjectURL(sourceRef.current.objectUrl);
        sourceRef.current = null;
    }, []);

    const revokePreview = useCallback(() => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = "";
        }
        setPreviewUrl("");
    }, []);

    const resetAll = useCallback(() => {
        operationRef.current += 1;
        releaseSource();
        revokePreview();
        setFile(null);
        setImageSize(null);
        setValues(DEFAULTS);
        setError("");
        setStatus("");
        setProgress(0);
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [releaseSource, revokePreview]);

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
            revokePreview();
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
                previewUrlRef.current = loaded.objectUrl;
                setPreviewUrl(loaded.objectUrl);
                setFile(nextFile);
                setImageSize({ width: loaded.width, height: loaded.height });
                setValues(DEFAULTS);
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

    const setSlider = (key, val) => setValues((v) => ({ ...v, [key]: val }));

    const renderOutput = async () => {
        const src = sourceRef.current;
        if (!src?.image || !imageSize) throw new Error("Load an image first.");
        const canvas = document.createElement("canvas");
        canvas.width = imageSize.width;
        canvas.height = imageSize.height;
        const ctx = canvas.getContext("2d");
        ctx.filter = filterCss;
        ctx.drawImage(src.image, 0, 0);
        await waitFrame();
        const mime = exportFormat === "jpg" ? "image/jpeg" : "image/png";
        return canvasToBlob(canvas, mime, exportFormat === "jpg" ? quality / 100 : undefined);
    };

    const handleDownload = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        setProgress(60);
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

    const sliders = [
        { key: "brightness", label: "Brightness", min: -100, max: 100 },
        { key: "contrast", label: "Contrast", min: -100, max: 100 },
        { key: "saturation", label: "Saturation", min: -100, max: 100 },
        { key: "hue", label: "Hue", min: -180, max: 180 },
        { key: "exposure", label: "Exposure", min: -100, max: 100 },
        { key: "temperature", label: "Temperature", min: -100, max: 100 },
    ];

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
                <p className="img-tool__dropzone-text">Drop an image (max 30 MB) or click to browse</p>
            </label>
            {file && imageSize ? (
                <div className="img-tool__meta">
                    <span className="img-tool__chip"><strong>{file.name}</strong></span>
                    <span className="img-tool__chip">{imageSize.width}×{imageSize.height}</span>
                    <span className="img-tool__chip">{formatBytes(file.size)}</span>
                </div>
            ) : null}
            {sliders.map(({ key, label, min, max }) => (
                <div key={key}>
                    <label className="img-tool__label">
                        {label} ({values[key]})
                    </label>
                    <input
                        className="img-tool__range"
                        type="range"
                        min={min}
                        max={max}
                        value={values[key]}
                        disabled={!imageSize}
                        onChange={(e) => setSlider(key, Number(e.target.value))}
                    />
                    <div className="img-tool__range-meta">
                        <span>{min}</span>
                        <button
                            type="button"
                            className="img-tool__btn"
                            style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem" }}
                            disabled={!imageSize}
                            onClick={() => setSlider(key, 0)}
                        >
                            Reset
                        </button>
                        <span>{max}</span>
                    </div>
                </div>
            ))}
            <div>
                <span className="img-tool__label">Compare view</span>
                <div className="img-tool__segmented">
                    <button
                        type="button"
                        className={`img-tool__segment${viewMode === "split" ? " is-active" : ""}`}
                        disabled={!imageSize}
                        onClick={() => setViewMode("split")}
                    >
                        Side-by-side
                    </button>
                    <button
                        type="button"
                        className={`img-tool__segment${viewMode === "hold" ? " is-active" : ""}`}
                        disabled={!imageSize}
                        onClick={() => setViewMode("hold")}
                    >
                        Hold original
                    </button>
                </div>
            </div>
            {viewMode === "split" && imageSize ? (
                <div>
                    <label className="img-tool__label">Split position ({splitPos}%)</label>
                    <input
                        className="img-tool__range"
                        type="range"
                        min={5}
                        max={95}
                        value={splitPos}
                        onChange={(e) => setSplitPos(Number(e.target.value))}
                    />
                </div>
            ) : null}
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
                <button type="button" className="img-tool__btn" disabled={!imageSize || isProcessing} onClick={() => setValues(DEFAULTS)}>
                    Reset All
                </button>
                <button type="button" className="img-tool__btn" disabled={!imageSize || isProcessing} onClick={resetAll}>
                    New Image
                </button>
            </div>
        </>
    );

    const right = (
        <div
            className="img-tool__preview-frame"
            style={{ maxHeight: "min(50vh, 380px)", position: "relative" }}
            onPointerDown={() => viewMode === "hold" && setHoldingOriginal(true)}
            onPointerUp={() => setHoldingOriginal(false)}
            onPointerLeave={() => setHoldingOriginal(false)}
        >
            {previewUrl && imageSize ? (
                viewMode === "split" ? (
                    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img
                            ref={previewImgRef}
                            src={previewUrl}
                            alt="Original"
                            className="img-tool__preview-image"
                            style={{ position: "absolute", clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
                        />
                        <img
                            src={previewUrl}
                            alt="Adjusted"
                            className="img-tool__preview-image"
                            style={{
                                position: "absolute",
                                filter: filterCss,
                                clipPath: `inset(0 0 0 ${splitPos}%)`,
                            }}
                        />
                        <div
                            style={{
                                position: "absolute",
                                top: 0,
                                bottom: 0,
                                left: `${splitPos}%`,
                                width: 2,
                                background: "#10b981",
                                pointerEvents: "none",
                            }}
                        />
                    </div>
                ) : (
                    <img
                        ref={previewImgRef}
                        src={previewUrl}
                        alt="Preview"
                        className="img-tool__preview-image"
                        style={{ filter: showOriginal ? "none" : filterCss }}
                    />
                )
            ) : (
                <p className="img-tool__preview-empty">Upload an image to adjust colors</p>
            )}
            {viewMode === "hold" && imageSize ? (
                <p className="img-tool__hint" style={{ position: "absolute", bottom: 8, left: 8, right: 8, textAlign: "center" }}>
                    {holdingOriginal ? "Showing original" : "Press and hold to view original"}
                </p>
            ) : null}
        </div>
    );

    return (
        <ImageToolWorkspace
            title="Color Adjustments"
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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import ImageToolRange from "../_shared/ImageToolRange";
import {
    COMPRESS_ACCEPT,
    createCanvas,
    downloadZip,
    formatBytes,
    loadImageFromFileWithProgress,
    validateCompressImage,
    waitFrame,
    preventDragDefaults,
} from "../_shared/imageToolUtils";

const PRESET_CATEGORIES = {
    instagram: {
        label: "Instagram",
        presets: {
            "ig-3x1": { rows: 1, cols: 3, label: "3×1 Row" },
            "ig-3x2": { rows: 2, cols: 3, label: "3×2 Grid" },
            "ig-3x3": { rows: 3, cols: 3, label: "3×3 Carousel" },
            "ig-3x4": { rows: 4, cols: 3, label: "3×4 Giant Grid" },
        },
    },
    panoramas: {
        label: "Panoramas",
        presets: {
            "pan-2x1": { rows: 1, cols: 2, label: "2×1 Swipe" },
            "pan-3x1": { rows: 1, cols: 3, label: "3×1 Swipe" },
        },
    },
    standard: {
        label: "Standard",
        presets: {
            "std-2x2": { rows: 2, cols: 2, label: "2×2" },
            "std-4x4": { rows: 4, cols: 4, label: "4×4" },
        },
    },
    twitter: {
        label: "Twitter / X",
        presets: {
            "x-4grid": { rows: 2, cols: 2, label: "4-Image Grid" },
        },
    },
    custom: {
        label: "Custom",
        presets: {
            custom: { rows: 2, cols: 2, label: "Custom Grid", isCustom: true },
        },
    },
};

const PRESETS = Object.fromEntries(
    Object.values(PRESET_CATEGORIES).flatMap((category) => Object.entries(category.presets)),
);

const DEFAULT_PRESET = "ig-3x3";

function getCategoryForPreset(presetKey) {
    for (const [catKey, category] of Object.entries(PRESET_CATEGORIES)) {
        if (category.presets[presetKey]) return catKey;
    }
    return "instagram";
}

function sliceImage(image, rows, cols) {
    const sliceW = Math.floor(image.naturalWidth / cols);
    const sliceH = Math.floor(image.naturalHeight / rows);
    const slices = [];

    for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
            const { canvas, ctx } = createCanvas(sliceW, sliceH);
            ctx.drawImage(
                image,
                c * sliceW,
                r * sliceH,
                sliceW,
                sliceH,
                0,
                0,
                sliceW,
                sliceH,
            );
            slices.push({ canvas, row: r, col: c, name: `slice-r${r + 1}-c${c + 1}.png` });
        }
    }
    return slices;
}

function getCanvasDimensions(image, rows, cols) {
    const targetAspect = cols / rows;
    const imageAspect = image.naturalWidth / image.naturalHeight;

    if (Math.abs(imageAspect - targetAspect) < 0.01) {
        return {
            width: image.naturalWidth,
            height: image.naturalHeight,
            needsLetterbox: false,
        };
    }

    if (imageAspect > targetAspect) {
        const height = image.naturalHeight;
        return {
            width: Math.round(height * targetAspect),
            height,
            needsLetterbox: true,
        };
    }

    const width = image.naturalWidth;
    return {
        width,
        height: Math.round(width / targetAspect),
        needsLetterbox: true,
    };
}

function composeImageForGrid(image, rows, cols, options) {
    const {
        letterboxMode,
        letterboxColor,
        zoom = 1,
        panX = 0,
        panY = 0,
    } = options;
    const { width: canvasW, height: canvasH, needsLetterbox } = getCanvasDimensions(image, rows, cols);
    const { canvas, ctx } = createCanvas(canvasW, canvasH);

    if (needsLetterbox && letterboxMode === "color") {
        ctx.fillStyle = letterboxColor;
        ctx.fillRect(0, 0, canvasW, canvasH);
    }

    const containScale = Math.min(canvasW / image.naturalWidth, canvasH / image.naturalHeight);
    const drawScale = containScale * zoom;
    const drawW = image.naturalWidth * drawScale;
    const drawH = image.naturalHeight * drawScale;
    const cx = canvasW / 2 + panX;
    const cy = canvasH / 2 + panY;

    ctx.drawImage(image, cx - drawW / 2, cy - drawH / 2, drawW, drawH);

    return canvas;
}

function ImageSplitter() {
    const fileInputRef = useRef(null);
    const previewCanvasRef = useRef(null);
    const dragRef = useRef(null);
    const sourceRef = useRef(null);
    const operationRef = useRef(0);

    const [file, setFile] = useState(null);
    const [sourceImage, setSourceImage] = useState(null);
    const [dimensions, setDimensions] = useState(null);
    const [activeCategory, setActiveCategory] = useState("instagram");
    const [preset, setPreset] = useState(DEFAULT_PRESET);
    const [rows, setRows] = useState(3);
    const [cols, setCols] = useState(3);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [showProgress, setShowProgress] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [letterboxMode, setLetterboxMode] = useState("transparent");
    const [letterboxColor, setLetterboxColor] = useState("#1e293b");
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });

    const presetDef = PRESETS[preset] || PRESETS[DEFAULT_PRESET];
    const isCustom = Boolean(presetDef.isCustom);
    const effectiveRows = isCustom ? rows : presetDef.rows;
    const effectiveCols = isCustom ? cols : presetDef.cols;
    const targetAspect = effectiveCols / effectiveRows;
    const needsLetterbox = Boolean(
        dimensions &&
            Math.abs(dimensions.width / dimensions.height - targetAspect) >= 0.01,
    );

    const releaseSource = useCallback(() => {
        if (sourceRef.current?.objectUrl) URL.revokeObjectURL(sourceRef.current.objectUrl);
        sourceRef.current = null;
    }, []);

    const composeOptions = useMemo(
        () => ({
            letterboxMode,
            letterboxColor,
            zoom,
            panX: pan.x,
            panY: pan.y,
        }),
        [letterboxMode, letterboxColor, zoom, pan.x, pan.y],
    );

    const resetPlacement = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);

    const resetTool = useCallback(() => {
        operationRef.current += 1;
        releaseSource();
        resetPlacement();
        setFile(null);
        setSourceImage(null);
        setDimensions(null);
        setError("");
        setStatus("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [releaseSource, resetPlacement]);

    const ingestFile = useCallback(
        async (nextFile) => {
            const validation = validateCompressImage(nextFile);
            if (!validation.ok) {
                setError(validation.error);
                return;
            }
            const op = operationRef.current + 1;
            operationRef.current = op;
            releaseSource();
            resetPlacement();
            setError("");
            setShowProgress(true);
            setProgressLabel("Loading...");
            try {
                const loaded = await loadImageFromFileWithProgress(nextFile, (p) => setProgress(p));
                if (operationRef.current !== op) {
                    URL.revokeObjectURL(loaded.objectUrl);
                    return;
                }
                sourceRef.current = loaded;
                setFile(nextFile);
                setSourceImage(loaded.image);
                setDimensions({ width: loaded.width, height: loaded.height });
                setShowProgress(false);
            } catch (err) {
                setError(err.message);
                setShowProgress(false);
            }
        },
        [releaseSource, resetPlacement],
    );

    const handleCategoryChange = (categoryKey) => {
        setActiveCategory(categoryKey);
        resetPlacement();
        const firstKey = Object.keys(PRESET_CATEGORIES[categoryKey].presets)[0];
        if (!PRESET_CATEGORIES[categoryKey].presets[preset]) {
            handlePreset(firstKey);
        }
    };

    const handlePreset = (key) => {
        setPreset(key);
        setActiveCategory(getCategoryForPreset(key));
        resetPlacement();
        const next = PRESETS[key];
        if (!next?.isCustom) {
            setRows(next.rows);
            setCols(next.cols);
        }
    };

    const handleDownloadZip = async () => {
        if (!sourceImage || isProcessing) return;
        setIsProcessing(true);
        setShowProgress(true);
        setProgressLabel("Slicing image...");
        setProgress(20);

        try {
            await waitFrame();
            const sourceForSlice = composeImageForGrid(
                sourceImage,
                effectiveRows,
                effectiveCols,
                composeOptions,
            );
            const slices = sliceImage(sourceForSlice, effectiveRows, effectiveCols);
            setProgress(60);
            setProgressLabel("Building ZIP...");

            const files = [];
            for (let i = 0; i < slices.length; i += 1) {
                const s = slices[i];
                const blob = await new Promise((resolve, reject) => {
                    s.canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Slice failed"))), "image/png");
                });
                files.push({ name: s.name, blob });
                setProgress(60 + Math.round(((i + 1) / slices.length) * 35));
            }

            const base = file?.name?.replace(/\.[^.]+$/, "") || "image";
            await downloadZip(files, `${base}-slices.zip`);
            setStatus(`${files.length} slices downloaded as ZIP.`);
            setProgress(100);
        } catch (err) {
            setError(err.message || "Export failed.");
        } finally {
            setIsProcessing(false);
            setShowProgress(false);
        }
    };

    useEffect(
        () => () => {
            operationRef.current += 1;
            releaseSource();
        },
        [releaseSource],
    );

    const drawPreview = useCallback(() => {
        const canvas = previewCanvasRef.current;
        if (!canvas || !sourceImage) return;

        const composed = composeImageForGrid(
            sourceImage,
            effectiveRows,
            effectiveCols,
            composeOptions,
        );

        canvas.width = composed.width;
        canvas.height = composed.height;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, composed.width, composed.height);
        ctx.drawImage(composed, 0, 0);

        const frame = canvas.parentElement?.getBoundingClientRect();
        const displayScale = Math.min(
            (frame?.width || 400) / composed.width,
            (frame?.height || 300) / composed.height,
            1,
        );
        canvas.style.width = `${composed.width * displayScale}px`;
        canvas.style.height = `${composed.height * displayScale}px`;
    }, [sourceImage, effectiveRows, effectiveCols, composeOptions]);

    useEffect(() => {
        drawPreview();
    }, [drawPreview]);

    const handlePointerDown = (e) => {
        if (!sourceImage || isProcessing) return;
        dragRef.current = { startX: e.clientX, startY: e.clientY, startPan: { ...pan } };
    };

    const handlePointerMove = (e) => {
        const drag = dragRef.current;
        const canvas = previewCanvasRef.current;
        if (!drag || !canvas || !canvas.width) return;

        const displayScale = canvas.clientWidth / canvas.width;
        setPan({
            x: drag.startPan.x + (e.clientX - drag.startX) / displayScale,
            y: drag.startPan.y + (e.clientY - drag.startY) / displayScale,
        });
    };

    const handlePointerUp = () => {
        dragRef.current = null;
    };

    useEffect(() => {
        const onMove = (event) => handlePointerMove(event);
        const onUp = () => handlePointerUp();
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        return () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
    });

    const hasImage = Boolean(sourceImage);
    const gridLines = [];
    for (let c = 1; c < effectiveCols; c += 1) {
        gridLines.push({ type: "v", pos: (c / effectiveCols) * 100 });
    }
    for (let r = 1; r < effectiveRows; r += 1) {
        gridLines.push({ type: "h", pos: (r / effectiveRows) * 100 });
    }

    const left = (
        <>
            <div>
                <span className="img-tool__label">Preset category</span>
                <div className="img-tool__tabs">
                    {Object.entries(PRESET_CATEGORIES).map(([key, category]) => (
                        <button
                            key={key}
                            type="button"
                            className={`img-tool__tab${activeCategory === key ? " is-active" : ""}`}
                            disabled={!hasImage || isProcessing}
                            onClick={() => handleCategoryChange(key)}
                        >
                            {category.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <span className="img-tool__label">Grid preset</span>
                <div className="img-tool__segmented" role="group" style={{ flexWrap: "wrap" }}>
                    {Object.entries(PRESET_CATEGORIES[activeCategory].presets).map(([key, p]) => (
                        <button
                            key={key}
                            type="button"
                            className={`img-tool__segment${preset === key ? " is-active" : ""}`}
                            disabled={!hasImage || isProcessing}
                            onClick={() => handlePreset(key)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {isCustom && (
                <div className="img-tool__field-row">
                    <div>
                        <label className="img-tool__label" htmlFor="split-rows">Rows</label>
                        <input
                            id="split-rows"
                            className="img-tool__input"
                            type="number"
                            min={1}
                            max={10}
                            value={rows}
                            disabled={!hasImage || isProcessing}
                            onChange={(e) => setRows(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
                        />
                    </div>
                    <div>
                        <label className="img-tool__label" htmlFor="split-cols">Columns</label>
                        <input
                            id="split-cols"
                            className="img-tool__input"
                            type="number"
                            min={1}
                            max={10}
                            value={cols}
                            disabled={!hasImage || isProcessing}
                            onChange={(e) => setCols(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
                        />
                    </div>
                </div>
            )}

            <p className="img-tool__hint">
                Grid: {effectiveRows}×{effectiveCols} = {effectiveRows * effectiveCols} slices
            </p>

            {needsLetterbox ? (
                <>
                    <p className="img-tool__notice">
                        This image aspect does not match the {effectiveCols}:{effectiveRows} grid. Choose a background fill before slicing.
                    </p>
                    <div>
                        <span className="img-tool__label">Letterbox background</span>
                        <div className="img-tool__segmented">
                            {[
                                ["transparent", "Transparent"],
                                ["color", "Colored"],
                            ].map(([val, label]) => (
                                <button
                                    key={val}
                                    type="button"
                                    className={`img-tool__segment${letterboxMode === val ? " is-active" : ""}`}
                                    disabled={!hasImage || isProcessing}
                                    onClick={() => setLetterboxMode(val)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {letterboxMode === "color" ? (
                        <div className="img-tool__color-row">
                            <input
                                className="img-tool__color-input"
                                type="color"
                                value={letterboxColor}
                                disabled={!hasImage || isProcessing}
                                onChange={(e) => setLetterboxColor(e.target.value)}
                                aria-label="Letterbox background color"
                            />
                            <input
                                className="img-tool__input"
                                value={letterboxColor}
                                disabled={!hasImage || isProcessing}
                                onChange={(e) => setLetterboxColor(e.target.value)}
                                aria-label="Letterbox background hex value"
                            />
                        </div>
                    ) : null}
                </>
            ) : null}

            {hasImage ? (
                <>
                    <ImageToolRange
                        label="Image zoom"
                        min={50}
                        max={300}
                        value={Math.round(zoom * 100)}
                        disabled={isProcessing}
                        onChange={(val) => setZoom(val / 100)}
                        unit="%"
                        lowLabel="Zoom out"
                        highLabel="Zoom in"
                    />
                    <button
                        type="button"
                        className="img-tool__btn"
                        disabled={isProcessing}
                        onClick={resetPlacement}
                    >
                        Reset position
                    </button>
                    <p className="img-tool__hint">Drag the preview to reposition the image inside the grid area.</p>
                </>
            ) : null}

            <div className="img-tool__actions">
                <button
                    type="button"
                    className="img-tool__btn img-tool__btn--primary"
                    disabled={!hasImage || isProcessing}
                    onClick={handleDownloadZip}
                >
                    Download Slices as ZIP
                </button>
                <button type="button" className="img-tool__btn" onClick={resetTool}>
                    Reset
                </button>
            </div>
        </>
    );

    const right = (
        <>
            <div
                className={`img-tool__dropzone${isDragging ? " is-dragging" : ""}`}
                onDragEnter={(e) => {
                    preventDragDefaults(e); setIsDragging(true); }}
                onDragOver={preventDragDefaults}
                onDragLeave={(e) => {
                    preventDragDefaults(e); if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false); }}
                onDrop={(e) => {
                    preventDragDefaults(e);
                    setIsDragging(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) ingestFile(f);
                }}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
            >
                <input
                    ref={fileInputRef}
                    className="img-tool__dropzone-input"
                    type="file"
                    accept={COMPRESS_ACCEPT}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) ingestFile(f); }}
                />
                <p className="img-tool__dropzone-text">
                    {file ? `${file.name} (${formatBytes(file.size)})` : "Drop an image to split into a grid"}
                </p>
            </div>

            {dimensions && (
                <div className="img-tool__meta">
                    <span className="img-tool__chip">
                        <strong>{dimensions.width}</strong>×<strong>{dimensions.height}</strong>
                    </span>
                    <span className="img-tool__chip">
                        {effectiveRows}×{effectiveCols} grid
                    </span>
                </div>
            )}

            <div className="img-tool__preview-frame">
                {sourceImage ? (
                    <div
                        className="img-tool__split-preview-wrap"
                        style={{ position: "relative", display: "inline-block", lineHeight: 0 }}
                    >
                        <canvas
                            ref={previewCanvasRef}
                            className="img-tool__preview-canvas"
                            style={{ cursor: "grab", touchAction: "none", display: "block" }}
                            onPointerDown={handlePointerDown}
                            aria-label="Grid slice preview"
                        />
                        <div className="img-tool__grid-overlay" aria-hidden="true">
                            {gridLines.map((line, i) => (
                                <div
                                    key={i}
                                    className={`img-tool__grid-line img-tool__grid-line--${line.type}`}
                                    style={
                                        line.type === "v"
                                            ? { left: `${line.pos}%` }
                                            : { top: `${line.pos}%` }
                                    }
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="img-tool__preview-empty">Upload an image to preview grid cuts</p>
                )}
            </div>
        </>
    );

    return (
        <ImageToolWorkspace
            title="Image Splitter"
            error={error}
            status={status}
            left={left}
            right={right}
            showProgress={showProgress}
            progress={progress}
            progressLabel={progressLabel}
        />
    );
}

export default ImageSplitter;

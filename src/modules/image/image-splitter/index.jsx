import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import {COMPRESS_ACCEPT,
    createCanvas,
    downloadZip,
    formatBytes,
    loadImageFromFileWithProgress,
    validateCompressImage,
    waitFrame, preventDragDefaults } from "../_shared/imageToolUtils";
// preventDragDefaults imported below

const PRESETS = {
    "3x1": { rows: 1, cols: 3, label: "Instagram 3×1" },
    "3x2": { rows: 2, cols: 3, label: "Instagram 3×2" },
    "3x3": { rows: 3, cols: 3, label: "Instagram 3×3" },
    custom: { rows: 2, cols: 2, label: "Custom" },
};

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

function ImageSplitter() {
    const fileInputRef = useRef(null);
    const sourceRef = useRef(null);
    const previewUrlRef = useRef("");
    const operationRef = useRef(0);

    const [file, setFile] = useState(null);
    const [sourceImage, setSourceImage] = useState(null);
    const [dimensions, setDimensions] = useState(null);
    const [preset, setPreset] = useState("3x3");
    const [rows, setRows] = useState(3);
    const [cols, setCols] = useState(3);
    const [previewUrl, setPreviewUrl] = useState("");
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [showProgress, setShowProgress] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const effectiveRows = preset === "custom" ? rows : PRESETS[preset].rows;
    const effectiveCols = preset === "custom" ? cols : PRESETS[preset].cols;

    const releaseSource = useCallback(() => {
        if (sourceRef.current?.objectUrl) URL.revokeObjectURL(sourceRef.current.objectUrl);
        sourceRef.current = null;
    }, []);

    const revokePreview = useCallback(() => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = "";
        }
    }, []);

    const resetTool = useCallback(() => {
        operationRef.current += 1;
        releaseSource();
        revokePreview();
        setFile(null);
        setSourceImage(null);
        setDimensions(null);
        setPreviewUrl("");
        setError("");
        setStatus("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [releaseSource, revokePreview]);

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
            revokePreview();
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
                const url = loaded.objectUrl;
                previewUrlRef.current = url;
                setPreviewUrl(url);
                setFile(nextFile);
                setSourceImage(loaded.image);
                setDimensions({ width: loaded.width, height: loaded.height });
                setShowProgress(false);
            } catch (err) {
                setError(err.message);
                setShowProgress(false);
            }
        },
        [releaseSource, revokePreview],
    );

    const handlePreset = (key) => {
        setPreset(key);
        if (key !== "custom") {
            setRows(PRESETS[key].rows);
            setCols(PRESETS[key].cols);
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
            const slices = sliceImage(sourceImage, effectiveRows, effectiveCols);
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
            revokePreview();
        },
        [releaseSource, revokePreview],
    );

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
                <span className="img-tool__label">Grid preset</span>
                <div className="img-tool__segmented" role="group">
                    {Object.entries(PRESETS).map(([key, p]) => (
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

            {preset === "custom" && (
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
                {previewUrl ? (
                    <>
                        <img className="img-tool__preview-image" src={previewUrl} alt="Grid preview" />
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
                    </>
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

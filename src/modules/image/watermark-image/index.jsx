import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import {IMAGE_ACCEPT,
    canvasToBlob,
    createCanvas,
    formatBytes,
    loadImageFromFileWithProgress,
    loadImageFromUrl,
    replaceExtension,
    triggerDownload,
    validateStandardImage, preventDragDefaults } from "../_shared/imageToolUtils";
// preventDragDefaults imported below

const ANCHORS = [
    ["top-left", "TL"], ["top-center", "TC"], ["top-right", "TR"],
    ["center-left", "CL"], ["center", "C"], ["center-right", "CR"],
    ["bottom-left", "BL"], ["bottom-center", "BC"], ["bottom-right", "BR"],
];

function getAnchorPosition(anchor, w, h, pad) {
    const map = {
        "top-left": [pad, pad],
        "top-center": [w / 2, pad],
        "top-right": [w - pad, pad],
        "center-left": [pad, h / 2],
        center: [w / 2, h / 2],
        "center-right": [w - pad, h / 2],
        "bottom-left": [pad, h - pad],
        "bottom-center": [w / 2, h - pad],
        "bottom-right": [w - pad, h - pad],
    };
    return map[anchor] || [w / 2, h / 2];
}

function applyWatermark(baseImage, options) {
    const {
        mode,
        text,
        logoImage,
        anchor,
        opacity,
        rotation,
        padding,
        fontSize,
        tiled,
    } = options;

    const { canvas, ctx } = createCanvas(baseImage.naturalWidth, baseImage.naturalHeight);
    ctx.drawImage(baseImage, 0, 0);
    ctx.save();
    ctx.globalAlpha = opacity / 100;

    if (mode === "text" && text.trim()) {
        ctx.font = `bold ${fontSize}px Impact, "Arial Black", sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.lineWidth = 2;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";

        const drawTextAt = (x, y) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.strokeText(text, 0, 0);
            ctx.fillText(text, 0, 0);
            ctx.restore();
        };

        if (tiled) {
            const stepX = ctx.measureText(text).width + padding * 3;
            const stepY = fontSize + padding * 3;
            for (let y = stepY / 2; y < canvas.height + stepY; y += stepY) {
                for (let x = stepX / 2; x < canvas.width + stepX; x += stepX) {
                    drawTextAt(x, y);
                }
            }
        } else {
            const [ax, ay] = getAnchorPosition(anchor, canvas.width, canvas.height, padding);
            drawTextAt(ax, ay);
        }
    }

    if (mode === "logo" && logoImage) {
        const scale = fontSize / 100;
        const lw = logoImage.naturalWidth * scale;
        const lh = logoImage.naturalHeight * scale;

        const drawLogoAt = (x, y) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.drawImage(logoImage, -lw / 2, -lh / 2, lw, lh);
            ctx.restore();
        };

        if (tiled) {
            const stepX = lw + padding * 3;
            const stepY = lh + padding * 3;
            for (let y = stepY / 2; y < canvas.height + stepY; y += stepY) {
                for (let x = stepX / 2; x < canvas.width + stepX; x += stepX) {
                    drawLogoAt(x, y);
                }
            }
        } else {
            const [ax, ay] = getAnchorPosition(anchor, canvas.width, canvas.height, padding + lw / 2);
            drawLogoAt(ax, ay);
        }
    }

    ctx.restore();
    return canvas;
}

function WatermarkImage() {
    const fileInputRef = useRef(null);
    const logoInputRef = useRef(null);
    const canvasRef = useRef(null);
    const sourceRef = useRef(null);
    const logoRef = useRef(null);
    const operationRef = useRef(0);

    const [file, setFile] = useState(null);
    const [sourceImage, setSourceImage] = useState(null);
    const [mode, setMode] = useState("text");
    const [text, setText] = useState("© Your Brand");
    const [logoImage, setLogoImage] = useState(null);
    const [placement, setPlacement] = useState("anchor");
    const [anchor, setAnchor] = useState("bottom-right");
    const [opacity, setOpacity] = useState(50);
    const [rotation, setRotation] = useState(0);
    const [padding, setPadding] = useState(24);
    const [fontSize, setFontSize] = useState(48);
    const [exportFormat, setExportFormat] = useState("png");
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [showProgress, setShowProgress] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState("");

    const tiled = placement === "tiled";

    const releaseSource = useCallback(() => {
        if (sourceRef.current?.objectUrl) URL.revokeObjectURL(sourceRef.current.objectUrl);
        sourceRef.current = null;
    }, []);

    const releaseLogo = useCallback(() => {
        if (logoRef.current?.objectUrl) URL.revokeObjectURL(logoRef.current.objectUrl);
        logoRef.current = null;
    }, []);

    const resetTool = useCallback(() => {
        operationRef.current += 1;
        releaseSource();
        releaseLogo();
        setFile(null);
        setSourceImage(null);
        setLogoImage(null);
        setError("");
        setStatus("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (logoInputRef.current) logoInputRef.current.value = "";
    }, [releaseSource, releaseLogo]);

    const ingestFile = useCallback(
        async (nextFile) => {
            const validation = validateStandardImage(nextFile);
            if (!validation.ok) {
                setError(validation.error);
                return;
            }
            const op = operationRef.current + 1;
            operationRef.current = op;
            releaseSource();
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
                setShowProgress(false);
            } catch (err) {
                setError(err.message);
                setShowProgress(false);
            }
        },
        [releaseSource],
    );

    const ingestLogo = useCallback(
        async (nextFile) => {
            const validation = validateStandardImage(nextFile, 10 * 1024 * 1024);
            if (!validation.ok) {
                setError(validation.error);
                return;
            }
            releaseLogo();
            try {
                const url = URL.createObjectURL(nextFile);
                const loaded = await loadImageFromUrl(url);
                logoRef.current = { objectUrl: url, image: loaded.image };
                setLogoImage(loaded.image);
            } catch (err) {
                setError(err.message);
            }
        },
        [releaseLogo],
    );

    const paint = useCallback(() => {
        if (!sourceImage || !canvasRef.current) return;
        const canvas = applyWatermark(sourceImage, {
            mode,
            text,
            logoImage,
            anchor,
            opacity,
            rotation,
            padding,
            fontSize,
            tiled,
        });
        const display = canvasRef.current;
        display.width = canvas.width;
        display.height = canvas.height;
        const ctx = display.getContext("2d");
        ctx.drawImage(canvas, 0, 0);
    }, [sourceImage, mode, text, logoImage, placement, anchor, opacity, rotation, padding, fontSize, tiled]);

    useEffect(() => {
        paint();
    }, [paint]);

    useEffect(
        () => () => {
            operationRef.current += 1;
            releaseSource();
            releaseLogo();
        },
        [releaseSource, releaseLogo],
    );

    const handleDownload = async () => {
        if (!sourceImage) return;
        setShowProgress(true);
        setProgressLabel("Exporting...");
        try {
            const canvas = applyWatermark(sourceImage, {
                mode,
                text,
                logoImage,
                anchor,
                opacity,
                rotation,
                padding,
                fontSize,
                tiled,
            });
            const mime = exportFormat === "jpg" ? "image/jpeg" : "image/png";
            const blob = await canvasToBlob(canvas, mime, exportFormat === "jpg" ? 0.92 : undefined);
            const ext = exportFormat === "jpg" ? "jpg" : "png";
            triggerDownload(blob, replaceExtension(file?.name || "watermarked.png", ext));
            setStatus("Watermarked image downloaded.");
        } catch (err) {
            setError(err.message);
        } finally {
            setShowProgress(false);
        }
    };

    const hasImage = Boolean(sourceImage);

    const left = (
        <>
            <div>
                <span className="img-tool__label">Watermark type</span>
                <div className="img-tool__segmented">
                    {[
                        ["text", "Text"],
                        ["logo", "Logo"],
                    ].map(([val, label]) => (
                        <button
                            key={val}
                            type="button"
                            className={`img-tool__segment${mode === val ? " is-active" : ""}`}
                            disabled={!hasImage}
                            onClick={() => setMode(val)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {mode === "text" ? (
                <div>
                    <label className="img-tool__label" htmlFor="wm-text">Text</label>
                    <input
                        id="wm-text"
                        className="img-tool__input"
                        type="text"
                        value={text}
                        disabled={!hasImage}
                        onChange={(e) => setText(e.target.value)}
                    />
                </div>
            ) : (
                <div>
                    <label className="img-tool__label">Logo image</label>
                    <button
                        type="button"
                        className="img-tool__btn"
                        disabled={!hasImage}
                        onClick={() => logoInputRef.current?.click()}
                    >
                        {logoImage ? "Replace logo" : "Upload logo"}
                    </button>
                    <input
                        ref={logoInputRef}
                        className="img-tool__dropzone-input"
                        type="file"
                        accept={IMAGE_ACCEPT}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) ingestLogo(f); }}
                    />
                </div>
            )}

            <div>
                <span className="img-tool__label">Placement</span>
                <div className="img-tool__segmented">
                    {[
                        ["anchor", "9-Point Grid"],
                        ["tiled", "Tiled"],
                    ].map(([val, label]) => (
                        <button
                            key={val}
                            type="button"
                            className={`img-tool__segment${placement === val ? " is-active" : ""}`}
                            disabled={!hasImage}
                            onClick={() => setPlacement(val)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {placement === "anchor" && (
                <div>
                    <span className="img-tool__label">Anchor position</span>
                    <div className="img-tool__segmented" style={{ borderRadius: 12 }}>
                        {ANCHORS.map(([val, label]) => (
                            <button
                                key={val}
                                type="button"
                                className={`img-tool__segment${anchor === val ? " is-active" : ""}`}
                                disabled={!hasImage}
                                onClick={() => setAnchor(val)}
                                style={{ padding: "0.35rem 0.55rem", fontSize: "0.7rem" }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <label className="img-tool__label" htmlFor="wm-opacity">Opacity</label>
                <input
                    id="wm-opacity"
                    className="img-tool__range"
                    type="range"
                    min={5}
                    max={100}
                    value={opacity}
                    disabled={!hasImage}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                />
                <div className="img-tool__range-meta">
                    <span>5%</span>
                    <span className="img-tool__range-value">{opacity}%</span>
                    <span>100%</span>
                </div>
            </div>

            <div>
                <label className="img-tool__label" htmlFor="wm-rotation">Rotation</label>
                <input
                    id="wm-rotation"
                    className="img-tool__range"
                    type="range"
                    min={-180}
                    max={180}
                    value={rotation}
                    disabled={!hasImage}
                    onChange={(e) => setRotation(Number(e.target.value))}
                />
                <div className="img-tool__range-meta">
                    <span>-180°</span>
                    <span className="img-tool__range-value">{rotation}°</span>
                    <span>180°</span>
                </div>
            </div>

            <div>
                <label className="img-tool__label" htmlFor="wm-padding">Padding</label>
                <input
                    id="wm-padding"
                    className="img-tool__range"
                    type="range"
                    min={0}
                    max={120}
                    value={padding}
                    disabled={!hasImage}
                    onChange={(e) => setPadding(Number(e.target.value))}
                />
            </div>

            <div>
                <label className="img-tool__label" htmlFor="wm-size">
                    {mode === "text" ? "Font size" : "Logo scale"}
                </label>
                <input
                    id="wm-size"
                    className="img-tool__range"
                    type="range"
                    min={mode === "text" ? 12 : 10}
                    max={mode === "text" ? 120 : 200}
                    value={fontSize}
                    disabled={!hasImage}
                    onChange={(e) => setFontSize(Number(e.target.value))}
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
                            disabled={!hasImage}
                            onClick={() => setExportFormat(f)}
                        >
                            {f.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="img-tool__actions">
                <button
                    type="button"
                    className="img-tool__btn img-tool__btn--primary"
                    disabled={!hasImage}
                    onClick={handleDownload}
                >
                    Export Watermarked Image
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
                    accept={IMAGE_ACCEPT}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) ingestFile(f); }}
                />
                <p className="img-tool__dropzone-text">
                    {file ? `${file.name} (${formatBytes(file.size)})` : "Drop an image to watermark"}
                </p>
            </div>
            <div className="img-tool__canvas-wrap">
                {hasImage ? (
                    <canvas ref={canvasRef} aria-label="Watermarked preview" />
                ) : (
                    <p className="img-tool__preview-empty">Upload an image to preview watermark</p>
                )}
            </div>
        </>
    );

    return (
        <ImageToolWorkspace
            title="Watermark Image"
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

export default WatermarkImage;

import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import {IMAGE_ACCEPT,
    MB,
    canvasToBlob,
    createCanvas,
    formatBytes,
    loadImageFromBuffer,
    readFileWithProgress,
    triggerDownload,
    validateStandardImage,
    waitFrame, preventDragDefaults } from "../_shared/imageToolUtils";
// preventDragDefaults imported below

const MAX_IMAGES = 10;
const MAX_FILE_BYTES = 25 * MB;
const MAX_DIMENSION = 16384;

const FONT_FAMILIES = [
    ["Impact, Arial Black, sans-serif", "Impact"],
    ["Arial, Helvetica, sans-serif", "Arial"],
    ["Georgia, Times New Roman, serif", "Georgia"],
    ["IBM Plex Sans, sans-serif", "IBM Plex Sans"],
    ["Courier New, Courier, monospace", "Courier New"],
];

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

function drawStyledImage(ctx, img, x, y, w, h, { cornerRadius, borderWidth, borderColor }) {
    const radius = Math.min(cornerRadius, w / 2, h / 2);
    const totalBorder = borderWidth * 2;

    if (borderWidth > 0) {
        ctx.save();
        pathRoundRect(ctx, x - borderWidth, y - borderWidth, w + totalBorder, h + totalBorder, radius + borderWidth);
        ctx.fillStyle = borderColor;
        ctx.fill();
        ctx.restore();
    }

    ctx.save();
    pathRoundRect(ctx, x, y, w, h, radius);
    ctx.clip();
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
}

function stitchImages(images, options) {
    const {
        direction,
        spacing,
        alignment,
        bgColor,
        cornerRadius,
        borderWidth,
        borderColor,
        title,
        titleFontFamily,
        titleFontSize,
        titleColor,
    } = options;
    const isVertical = direction === "vertical";
    const sizes = images.map((img) => ({
        w: img.naturalWidth,
        h: img.naturalHeight,
    }));

    let contentW;
    let contentH;
    if (isVertical) {
        contentW = Math.max(...sizes.map((s) => s.w));
        contentH = sizes.reduce((sum, s) => sum + s.h, 0) + spacing * (images.length - 1);
    } else {
        contentW = sizes.reduce((sum, s) => sum + s.w, 0) + spacing * (images.length - 1);
        contentH = Math.max(...sizes.map((s) => s.h));
    }

    const titlePadding = title.trim() ? titleFontSize + 24 : 0;
    const canvasW = contentW;
    const canvasH = contentH + titlePadding;

    if (canvasW > MAX_DIMENSION || canvasH > MAX_DIMENSION) {
        throw new Error(`Stitched canvas exceeds ${MAX_DIMENSION}px limit.`);
    }

    const { canvas, ctx } = createCanvas(canvasW, canvasH);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasW, canvasH);

    if (title.trim()) {
        ctx.fillStyle = titleColor;
        ctx.font = `bold ${titleFontSize}px ${titleFontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(title.trim(), canvasW / 2, titlePadding / 2);
    }

    const contentOffsetY = titlePadding;
    let offset = 0;
    images.forEach((img, i) => {
        const { w, h } = sizes[i];
        let x = 0;
        let y = contentOffsetY;
        if (isVertical) {
            y = contentOffsetY + offset;
            if (alignment === "center") x = (canvasW - w) / 2;
            else if (alignment === "end") x = canvasW - w;
            offset += h + spacing;
        } else {
            x = offset;
            if (alignment === "center") y = contentOffsetY + (contentH - h) / 2;
            else if (alignment === "end") y = contentOffsetY + contentH - h;
            offset += w + spacing;
        }
        drawStyledImage(ctx, img, x, y, w, h, { cornerRadius, borderWidth, borderColor });
    });

    return canvas;
}

function ImageStitcher() {
    const fileInputRef = useRef(null);
    const operationRef = useRef(0);

    const [items, setItems] = useState([]);
    const [direction, setDirection] = useState("vertical");
    const [spacing, setSpacing] = useState(0);
    const [alignment, setAlignment] = useState("start");
    const [bgColor, setBgColor] = useState("#1e293b");
    const [cornerRadius, setCornerRadius] = useState(0);
    const [borderWidth, setBorderWidth] = useState(0);
    const [borderColor, setBorderColor] = useState("#10b981");
    const [title, setTitle] = useState("");
    const [titleFontFamily, setTitleFontFamily] = useState(FONT_FAMILIES[0][0]);
    const [titleFontSize, setTitleFontSize] = useState(32);
    const [titleColor, setTitleColor] = useState("#f8fafc");
    const [previewUrl, setPreviewUrl] = useState("");
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [showProgress, setShowProgress] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const revokeAll = useCallback((list) => {
        list.forEach((item) => {
            if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
            if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
        });
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    const clearAll = useCallback(() => {
        operationRef.current += 1;
        revokeAll(items);
        setItems([]);
        setPreviewUrl("");
        setError("");
        setStatus("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [items, revokeAll]);

    const addFiles = useCallback(
        async (fileList) => {
            const incoming = Array.from(fileList || []);
            if (!incoming.length) return;
            const next = [...items];
            const errors = [];

            for (const file of incoming) {
                if (next.length >= MAX_IMAGES) {
                    errors.push(`Maximum ${MAX_IMAGES} images allowed.`);
                    break;
                }
                const validation = validateStandardImage(file, MAX_FILE_BYTES);
                if (!validation.ok) {
                    errors.push(`${file.name}: ${validation.error}`);
                    continue;
                }
                try {
                    const buffer = await readFileWithProgress(file);
                    const loaded = await loadImageFromBuffer(buffer, file.type);
                    const thumbUrl = URL.createObjectURL(file);
                    next.push({
                        id: `${file.name}-${Date.now()}-${Math.random()}`,
                        file,
                        image: loaded.image,
                        objectUrl: loaded.objectUrl,
                        thumbUrl,
                        width: loaded.width,
                        height: loaded.height,
                    });
                } catch (err) {
                    errors.push(`${file.name}: ${err.message}`);
                }
            }

            setItems(next);
            setError(errors.join(" "));
            setStatus(next.length ? `${next.length} image(s) in queue.` : "");
        },
        [items],
    );

    const moveItem = (index, dir) => {
        const next = [...items];
        const target = index + dir;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        setItems(next);
    };

    const removeItem = (id) => {
        const item = items.find((i) => i.id === id);
        if (item) {
            if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
            if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
        }
        setItems(items.filter((i) => i.id !== id));
    };

    const handleStitch = async () => {
        if (items.length < 2 || isProcessing) return;
        setIsProcessing(true);
        setShowProgress(true);
        setProgressLabel("Stitching images...");
        setProgress(30);
        setError("");

        try {
            await waitFrame();
            const canvas = stitchImages(
                items.map((i) => i.image),
                {
                    direction,
                    spacing,
                    alignment,
                    bgColor,
                    cornerRadius,
                    borderWidth,
                    borderColor,
                    title,
                    titleFontFamily,
                    titleFontSize,
                    titleColor,
                },
            );
            setProgress(80);
            const blob = await canvasToBlob(canvas, "image/png");
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            setProgress(100);
            setStatus("Stitch complete. Download or add more images.");
        } catch (err) {
            setError(err.message || "Stitch failed.");
        } finally {
            setIsProcessing(false);
            setShowProgress(false);
        }
    };

    const handleDownload = async () => {
        if (!previewUrl) return;
        try {
            const res = await fetch(previewUrl);
            const blob = await res.blob();
            triggerDownload(blob, "stitched-image.png");
            setStatus("Download started.");
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(
        () => () => {
            operationRef.current += 1;
            items.forEach((item) => {
                if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
                if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const left = (
        <>
            <div>
                <span className="img-tool__label">Direction</span>
                <div className="img-tool__segmented">
                    {[
                        ["vertical", "Vertical"],
                        ["horizontal", "Horizontal"],
                    ].map(([val, label]) => (
                        <button
                            key={val}
                            type="button"
                            className={`img-tool__segment${direction === val ? " is-active" : ""}`}
                            disabled={isProcessing}
                            onClick={() => setDirection(val)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="img-tool__label" htmlFor="stitch-spacing">Spacing</label>
                <input
                    id="stitch-spacing"
                    className="img-tool__range"
                    type="range"
                    min={0}
                    max={60}
                    value={spacing}
                    disabled={isProcessing}
                    onChange={(e) => setSpacing(Number(e.target.value))}
                />
                <div className="img-tool__range-meta">
                    <span>0px</span>
                    <span className="img-tool__range-value">{spacing}px</span>
                    <span>60px</span>
                </div>
            </div>

            <div>
                <span className="img-tool__label">Alignment</span>
                <div className="img-tool__segmented">
                    {[
                        ["start", direction === "vertical" ? "Left" : "Top"],
                        ["center", "Center"],
                        ["end", direction === "vertical" ? "Right" : "Bottom"],
                    ].map(([val, label]) => (
                        <button
                            key={val}
                            type="button"
                            className={`img-tool__segment${alignment === val ? " is-active" : ""}`}
                            disabled={isProcessing}
                            onClick={() => setAlignment(val)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="img-tool__color-row">
                <input
                    className="img-tool__color-input"
                    type="color"
                    value={bgColor}
                    disabled={isProcessing}
                    onChange={(e) => setBgColor(e.target.value)}
                    aria-label="Spacer background color"
                />
                <span className="img-tool__hint">Gap background</span>
            </div>

            <div>
                <label className="img-tool__label" htmlFor="stitch-radius">Corner radius</label>
                <input
                    id="stitch-radius"
                    className="img-tool__range"
                    type="range"
                    min={0}
                    max={48}
                    value={cornerRadius}
                    disabled={isProcessing}
                    onChange={(e) => setCornerRadius(Number(e.target.value))}
                />
                <div className="img-tool__range-meta">
                    <span>0px</span>
                    <span className="img-tool__range-value">{cornerRadius}px</span>
                    <span>48px</span>
                </div>
            </div>

            <div>
                <label className="img-tool__label" htmlFor="stitch-border">Image border width</label>
                <input
                    id="stitch-border"
                    className="img-tool__range"
                    type="range"
                    min={0}
                    max={12}
                    value={borderWidth}
                    disabled={isProcessing}
                    onChange={(e) => setBorderWidth(Number(e.target.value))}
                />
                <div className="img-tool__range-meta">
                    <span>0px</span>
                    <span className="img-tool__range-value">{borderWidth}px</span>
                    <span>12px</span>
                </div>
            </div>

            {borderWidth > 0 && (
                <div className="img-tool__color-row">
                    <input
                        className="img-tool__color-input"
                        type="color"
                        value={borderColor}
                        disabled={isProcessing}
                        onChange={(e) => setBorderColor(e.target.value)}
                        aria-label="Image border color"
                    />
                    <span className="img-tool__hint">Image border color</span>
                </div>
            )}

            <div>
                <label className="img-tool__label" htmlFor="stitch-title">Title (optional)</label>
                <input
                    id="stitch-title"
                    className="img-tool__input"
                    type="text"
                    value={title}
                    disabled={isProcessing}
                    placeholder="Add a header title"
                    onChange={(e) => setTitle(e.target.value)}
                />
            </div>

            {title.trim() && (
                <>
                    <div>
                        <label className="img-tool__label" htmlFor="stitch-title-font">Title font</label>
                        <select
                            id="stitch-title-font"
                            className="img-tool__select"
                            value={titleFontFamily}
                            disabled={isProcessing}
                            onChange={(e) => setTitleFontFamily(e.target.value)}
                        >
                            {FONT_FAMILIES.map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="img-tool__label" htmlFor="stitch-title-size">Title size</label>
                        <input
                            id="stitch-title-size"
                            className="img-tool__range"
                            type="range"
                            min={16}
                            max={72}
                            value={titleFontSize}
                            disabled={isProcessing}
                            onChange={(e) => setTitleFontSize(Number(e.target.value))}
                        />
                        <div className="img-tool__range-meta">
                            <span>16px</span>
                            <span className="img-tool__range-value">{titleFontSize}px</span>
                            <span>72px</span>
                        </div>
                    </div>
                    <div className="img-tool__color-row">
                        <input
                            className="img-tool__color-input"
                            type="color"
                            value={titleColor}
                            disabled={isProcessing}
                            onChange={(e) => setTitleColor(e.target.value)}
                            aria-label="Title color"
                        />
                        <span className="img-tool__hint">Title color</span>
                    </div>
                </>
            )}

            <div className="img-tool__actions">
                <button
                    type="button"
                    className="img-tool__btn img-tool__btn--primary"
                    disabled={items.length < 2 || isProcessing}
                    onClick={handleStitch}
                >
                    Stitch &amp; Export
                </button>
                <button
                    type="button"
                    className="img-tool__btn"
                    disabled={!previewUrl || isProcessing}
                    onClick={handleDownload}
                >
                    Download PNG
                </button>
                <button type="button" className="img-tool__btn" onClick={clearAll}>
                    Clear
                </button>
            </div>
        </>
    );

    const right = (
        <>
            <div
                className={`img-tool__dropzone${isDragging ? " is-dragging" : ""}${isProcessing ? " is-disabled" : ""}`}
                onDragEnter={(e) => {
                    preventDragDefaults(e); setIsDragging(true); }}
                onDragOver={preventDragDefaults}
                onDragLeave={(e) => {
                    preventDragDefaults(e); if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false); }}
                onDrop={(e) => {
                    preventDragDefaults(e);
                    setIsDragging(false);
                    addFiles(e.dataTransfer.files);
                }}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
            >
                <input
                    ref={fileInputRef}
                    className="img-tool__dropzone-input"
                    type="file"
                    accept={IMAGE_ACCEPT}
                    multiple
                    disabled={isProcessing}
                    onChange={(e) => addFiles(e.target.files)}
                />
                <p className="img-tool__dropzone-text">
                    Add up to {MAX_IMAGES} images (max {formatBytes(MAX_FILE_BYTES)} each)
                </p>
            </div>

            {items.length > 0 && (
                <div className="img-tool__list">
                    {items.map((item, index) => (
                        <div key={item.id} className="img-tool__list-item">
                            <img className="img-tool__list-thumb" src={item.thumbUrl} alt="" />
                            <div className="img-tool__list-info">
                                <span className="img-tool__list-name">{item.file.name}</span>
                                <span className="img-tool__list-meta">
                                    {item.width}×{item.height} · {formatBytes(item.file.size)}
                                </span>
                            </div>
                            <div className="img-tool__list-actions">
                                <button
                                    type="button"
                                    className="img-tool__btn img-tool__btn--icon"
                                    disabled={index === 0 || isProcessing}
                                    onClick={() => moveItem(index, -1)}
                                    aria-label="Move up"
                                >
                                    ↑
                                </button>
                                <button
                                    type="button"
                                    className="img-tool__btn img-tool__btn--icon"
                                    disabled={index === items.length - 1 || isProcessing}
                                    onClick={() => moveItem(index, 1)}
                                    aria-label="Move down"
                                >
                                    ↓
                                </button>
                                <button
                                    type="button"
                                    className="img-tool__btn img-tool__btn--icon"
                                    disabled={isProcessing}
                                    onClick={() => removeItem(item.id)}
                                    aria-label="Remove"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="img-tool__preview-frame">
                {previewUrl ? (
                    <img className="img-tool__preview-image" src={previewUrl} alt="Stitched preview" />
                ) : (
                    <p className="img-tool__preview-empty">
                        {items.length >= 2 ? "Click Stitch to preview" : "Add at least 2 images to stitch"}
                    </p>
                )}
            </div>
        </>
    );

    return (
        <ImageToolWorkspace
            title="Image Stitcher"
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

export default ImageStitcher;

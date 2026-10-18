import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import ImageToolRange from "../_shared/ImageToolRange";
import {
    canvasToBlob,
    clamp,
    copyTextToClipboard,
    normalizeHexColor,
    triggerDownload,
} from "../_shared/imageToolUtils";

const MAX_DIMENSION = 4096;

const PRESETS = [
    { label: "Banner", width: 1200, height: 630 },
    { label: "Card", width: 600, height: 400 },
    { label: "Square", width: 500, height: 500 },
    { label: "HD", width: 1920, height: 1080 },
];

const FORMATS = [
    { id: "png", label: "PNG", mime: "image/png" },
    { id: "jpg", label: "JPG", mime: "image/jpeg" },
    { id: "svg", label: "SVG", mime: "image/svg+xml" },
];

const FONT_FAMILIES = [
    ["IBM Plex Sans, Arial, sans-serif", "IBM Plex Sans"],
    ["Arial, Helvetica, sans-serif", "Arial"],
    ["Georgia, Times New Roman, serif", "Georgia"],
    ["Courier New, Courier, monospace", "Courier New"],
    ["Impact, Arial Black, sans-serif", "Impact"],
];

const BG_STYLES = [
    ["solid", "Solid Color"],
    ["checkerboard", "Checkerboard"],
    ["dots", "Dots"],
    ["stripes", "Diagonal Stripes"],
];

function createPatternCanvas(style, color, width, height) {
    const tile = document.createElement("canvas");
    const size = style === "dots" ? 24 : 20;
    tile.width = size;
    tile.height = size;
    const ctx = tile.getContext("2d");
    const light = color;
    const dark = adjustBrightness(color, -18);

    if (style === "checkerboard") {
        ctx.fillStyle = light;
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = dark;
        ctx.fillRect(0, 0, size / 2, size / 2);
        ctx.fillRect(size / 2, size / 2, size / 2, size / 2);
    } else if (style === "dots") {
        ctx.fillStyle = light;
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, 3, 0, Math.PI * 2);
        ctx.fill();
    } else if (style === "stripes") {
        ctx.fillStyle = light;
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = dark;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-size, size);
        ctx.lineTo(size, -size);
        ctx.moveTo(0, size * 2);
        ctx.lineTo(size * 2, 0);
        ctx.stroke();
    }

    const patternCanvas = document.createElement("canvas");
    patternCanvas.width = width;
    patternCanvas.height = height;
    const pctx = patternCanvas.getContext("2d");
    const pattern = pctx.createPattern(tile, "repeat");
    pctx.fillStyle = pattern;
    pctx.fillRect(0, 0, width, height);
    return patternCanvas;
}

function adjustBrightness(hex, amount) {
    const n = normalizeHexColor(hex, "#1e293b");
    const r = clamp(parseInt(n.slice(1, 3), 16) + amount, 0, 255);
    const g = clamp(parseInt(n.slice(3, 5), 16) + amount, 0, 255);
    const b = clamp(parseInt(n.slice(5, 7), 16) + amount, 0, 255);
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function applyBorder(ctx, width, height, borderWidth, borderColor, borderStyle) {
    if (borderWidth <= 0) return;
    ctx.save();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    if (borderStyle === "dashed") ctx.setLineDash([borderWidth * 2, borderWidth * 1.5]);
    else if (borderStyle === "dotted") ctx.setLineDash([borderWidth, borderWidth]);
    const inset = borderWidth / 2;
    ctx.strokeRect(inset, inset, width - borderWidth, height - borderWidth);
    ctx.restore();
}

function paintPlaceholder(ctx, options) {
    const {
        width,
        height,
        bgStyle,
        bgColor,
        textColor,
        label,
        fontSize,
        fontFamily,
        borderWidth,
        borderColor,
        borderStyle,
    } = options;

    if (bgStyle === "solid") {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
    } else {
        const pattern = createPatternCanvas(bgStyle, bgColor, width, height);
        ctx.drawImage(pattern, 0, 0);
    }

    applyBorder(ctx, width, height, borderWidth, borderColor, borderStyle);

    const size = clamp(fontSize, 8, Math.min(width, height) / 2);
    ctx.fillStyle = textColor;
    ctx.font = `600 ${size}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, width / 2, height / 2);
}

function buildSvg(options) {
    const {
        width,
        height,
        bgColor,
        textColor,
        label,
        fontSize,
        fontFamily,
        borderWidth,
        borderColor,
        borderStyle,
        bgStyle,
    } = options;
    const escaped = label
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const dash = borderStyle === "dashed" ? "12 8" : borderStyle === "dotted" ? "4 4" : "none";
    const patternDefs = bgStyle === "checkerboard"
        ? `<pattern id="bg" width="20" height="20" patternUnits="userSpaceOnUse">
  <rect width="20" height="20" fill="${bgColor}"/>
  <rect width="10" height="10" fill="${adjustBrightness(bgColor, -18)}"/>
  <rect x="10" y="10" width="10" height="10" fill="${adjustBrightness(bgColor, -18)}"/>
</pattern>`
        : bgStyle === "dots"
            ? `<pattern id="bg" width="24" height="24" patternUnits="userSpaceOnUse">
  <rect width="24" height="24" fill="${bgColor}"/>
  <circle cx="12" cy="12" r="3" fill="${adjustBrightness(bgColor, -18)}"/>
</pattern>`
            : bgStyle === "stripes"
                ? `<pattern id="bg" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
  <rect width="20" height="20" fill="${bgColor}"/>
  <line x1="0" y1="0" x2="0" y2="20" stroke="${adjustBrightness(bgColor, -18)}" stroke-width="4"/>
</pattern>`
                : "";
    const fill = bgStyle === "solid" ? bgColor : "url(#bg)";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${patternDefs ? `<defs>${patternDefs}</defs>` : ""}
  <rect width="100%" height="100%" fill="${fill}"/>
  ${borderWidth > 0 ? `<rect x="${borderWidth / 2}" y="${borderWidth / 2}" width="${width - borderWidth}" height="${height - borderWidth}" fill="none" stroke="${borderColor}" stroke-width="${borderWidth}" stroke-dasharray="${dash}"/>` : ""}
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${textColor}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="600">${escaped}</text>
</svg>`;
}

function PlaceholderImageGenerator() {
    const [width, setWidth] = useState(600);
    const [height, setHeight] = useState(400);
    const [bgStyle, setBgStyle] = useState("solid");
    const [bgColor, setBgColor] = useState("#1e293b");
    const [textColor, setTextColor] = useState("#94a3b8");
    const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0][0]);
    const [label, setLabel] = useState("");
    const [fontSize, setFontSize] = useState(32);
    const [borderWidth, setBorderWidth] = useState(0);
    const [borderColor, setBorderColor] = useState("#10b981");
    const [borderStyle, setBorderStyle] = useState("solid");
    const [format, setFormat] = useState("png");
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [progress, setProgress] = useState(0);
    const [showProgress, setShowProgress] = useState(false);
    const canvasRef = useRef(null);
    const displayLabel = label.trim() || `${width} × ${height}`;
    const safeWidth = clamp(Math.round(width), 1, MAX_DIMENSION);
    const safeHeight = clamp(Math.round(height), 1, MAX_DIMENSION);
    const safeBg = normalizeHexColor(bgColor, "#1e293b");
    const safeText = normalizeHexColor(textColor, "#94a3b8");
    const safeBorder = normalizeHexColor(borderColor, "#10b981");

    const renderOptions = useMemo(
        () => ({
            width: safeWidth,
            height: safeHeight,
            bgStyle,
            bgColor: safeBg,
            textColor: safeText,
            label: displayLabel,
            fontSize,
            fontFamily,
            borderWidth,
            borderColor: safeBorder,
            borderStyle,
        }),
        [
            safeWidth,
            safeHeight,
            bgStyle,
            safeBg,
            safeText,
            displayLabel,
            fontSize,
            fontFamily,
            borderWidth,
            safeBorder,
            borderStyle,
        ],
    );

    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        canvas.width = safeWidth;
        canvas.height = safeHeight;
        const ctx = canvas.getContext("2d");
        paintPlaceholder(ctx, renderOptions);
        return canvas;
    }, [renderOptions, safeHeight, safeWidth]);

    const svgPreviewUrl = useMemo(() => {
        if (format !== "svg") return "";
        const svg = buildSvg({
            ...renderOptions,
            fontSize: clamp(fontSize, 8, Math.min(safeWidth, safeHeight) / 2),
        });
        return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }, [fontSize, format, renderOptions, safeHeight, safeWidth]);

    useEffect(() => {
        if (format === "svg") return;
        renderCanvas();
    }, [format, renderCanvas]);

    const exportBlob = useCallback(async () => {
        const selected = FORMATS.find((entry) => entry.id === format);
        if (!selected) return null;
        if (format === "svg") {
            const svg = buildSvg({
                ...renderOptions,
                fontSize: clamp(fontSize, 8, Math.min(safeWidth, safeHeight) / 2),
            });
            return new Blob([svg], { type: "image/svg+xml" });
        }
        const canvas = renderCanvas();
        if (!canvas) return null;
        return canvasToBlob(canvas, selected.mime, format === "jpg" ? 0.92 : undefined);
    }, [fontSize, format, renderCanvas, renderOptions, safeHeight, safeWidth]);

    const downloadImage = useCallback(async () => {
        setShowProgress(true);
        setProgress(40);
        try {
            const blob = await exportBlob();
            if (!blob) throw new Error("Export failed.");
            setProgress(90);
            triggerDownload(blob, `placeholder-${safeWidth}x${safeHeight}.${format}`);
            setStatus("Placeholder downloaded.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Download failed.");
        } finally {
            setShowProgress(false);
            setProgress(0);
        }
    }, [exportBlob, format, safeHeight, safeWidth]);

    const copyDataUri = useCallback(async () => {
        setShowProgress(true);
        setProgress(30);
        try {
            const blob = await exportBlob();
            if (!blob) throw new Error("Export failed.");
            const dataUri = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error("Could not encode data URI."));
                reader.readAsDataURL(blob);
            });
            await copyTextToClipboard(dataUri);
            setStatus("Data URI copied to clipboard.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Copy failed.");
        } finally {
            setShowProgress(false);
            setProgress(0);
        }
    }, [exportBlob]);

    const dimensionSummary = useMemo(
        () => `${safeWidth.toLocaleString()} × ${safeHeight.toLocaleString()} px`,
        [safeHeight, safeWidth],
    );

    const left = (
        <>
            <div>
                <span className="img-tool__label">Quick presets</span>
                <div className="img-tool__segmented">
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.label}
                            type="button"
                            className="img-tool__segment cursor-target"
                            onClick={() => {
                                setWidth(preset.width);
                                setHeight(preset.height);
                                setLabel("");
                            }}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="img-tool__field-row">
                <div>
                    <label className="img-tool__label" htmlFor="placeholder-width">Width (px)</label>
                    <input
                        id="placeholder-width"
                        type="number"
                        className="img-tool__input"
                        min={1}
                        max={MAX_DIMENSION}
                        value={width}
                        onChange={(e) => setWidth(Number(e.target.value))}
                    />
                </div>
                <div>
                    <label className="img-tool__label" htmlFor="placeholder-height">Height (px)</label>
                    <input
                        id="placeholder-height"
                        type="number"
                        className="img-tool__input"
                        min={1}
                        max={MAX_DIMENSION}
                        value={height}
                        onChange={(e) => setHeight(Number(e.target.value))}
                    />
                </div>
            </div>

            <div>
                <label className="img-tool__label" htmlFor="placeholder-label">Label</label>
                <input
                    id="placeholder-label"
                    type="text"
                    className="img-tool__input"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={dimensionSummary}
                />
            </div>

            <div>
                <label className="img-tool__label" htmlFor="ph-font">Font family</label>
                <select
                    id="ph-font"
                    className="img-tool__select"
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                >
                    {FONT_FAMILIES.map(([value, name]) => (
                        <option key={value} value={value}>{name}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="img-tool__label" htmlFor="placeholder-bg-style">Background style</label>
                <select
                    id="placeholder-bg-style"
                    className="img-tool__select"
                    value={bgStyle}
                    onChange={(e) => setBgStyle(e.target.value)}
                >
                    {BG_STYLES.map(([value, name]) => (
                        <option key={value} value={value}>{name}</option>
                    ))}
                </select>
            </div>

            <div className="img-tool__field-row">
                <div>
                    <label className="img-tool__label" htmlFor="placeholder-bg-color">Background</label>
                    <div className="img-tool__color-row">
                        <input
                            id="placeholder-bg-color"
                            type="color"
                            className="img-tool__color-input"
                            value={safeBg}
                            onChange={(e) => setBgColor(e.target.value)}
                        />
                        <input
                            type="text"
                            className="img-tool__input"
                            value={bgColor}
                            aria-label="Background hex value"
                            onChange={(e) => setBgColor(e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <label className="img-tool__label" htmlFor="placeholder-text-color">Text color</label>
                    <div className="img-tool__color-row">
                        <input
                            id="placeholder-text-color"
                            type="color"
                            className="img-tool__color-input"
                            value={safeText}
                            onChange={(e) => setTextColor(e.target.value)}
                        />
                        <input
                            type="text"
                            className="img-tool__input"
                            value={textColor}
                            aria-label="Text hex value"
                            onChange={(e) => setTextColor(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <ImageToolRange
                label="Font size"
                min={8}
                max={120}
                value={fontSize}
                onChange={setFontSize}
                unit="px"
                lowLabel="8px"
                highLabel="120px"
            />

            <ImageToolRange
                id="ph-border-width"
                label="Border width"
                min={0}
                max={24}
                value={borderWidth}
                onChange={setBorderWidth}
                unit="px"
                lowLabel="0px"
                highLabel="24px"
            />

            {borderWidth > 0 && (
                <>
                    <div className="img-tool__color-row">
                        <input
                            type="color"
                            className="img-tool__color-input"
                            value={safeBorder}
                            onChange={(e) => setBorderColor(e.target.value)}
                        />
                        <span className="img-tool__hint">Border color</span>
                    </div>
                    <div>
                        <span className="img-tool__label">Border style</span>
                        <div className="img-tool__segmented">
                            {[
                                ["solid", "Solid"],
                                ["dashed", "Dashed"],
                                ["dotted", "Dotted"],
                            ].map(([value, name]) => (
                                <button
                                    key={value}
                                    type="button"
                                    className={`img-tool__segment${borderStyle === value ? " is-active" : ""}`}
                                    onClick={() => setBorderStyle(value)}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <div>
                <span className="img-tool__label">Export format</span>
                <div className="img-tool__segmented">
                    {FORMATS.map((entry) => (
                        <button
                            key={entry.id}
                            type="button"
                            className={`img-tool__segment cursor-target${format === entry.id ? " is-active" : ""}`}
                            onClick={() => setFormat(entry.id)}
                        >
                            {entry.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="img-tool__meta">
                <span className="img-tool__chip img-tool__chip--accent">
                    <strong>Output</strong> {dimensionSummary}
                </span>
            </div>

            <div className="img-tool__actions">
                <button
                    type="button"
                    className="img-tool__btn img-tool__btn--primary cursor-target"
                    onClick={downloadImage}
                >
                    Download Placeholder
                </button>
                <button
                    type="button"
                    className="img-tool__btn cursor-target"
                    onClick={copyDataUri}
                >
                    Copy Data URI
                </button>
            </div>
        </>
    );

    const right = (
        <div className="img-tool__preview-frame">
            {format === "svg" ? (
                <img
                    src={svgPreviewUrl}
                    alt="Placeholder preview"
                    className="img-tool__preview-image"
                />
            ) : (
                <canvas ref={canvasRef} className="img-tool__preview-canvas" />
            )}
        </div>
    );

    return (
        <ImageToolWorkspace
            title="Placeholder Image Generator"
            error={error}
            status={status}
            left={left}
            right={right}
            progress={progress}
            progressLabel="Generating placeholder"
            showProgress={showProgress}
        />
    );
}

export default PlaceholderImageGenerator;

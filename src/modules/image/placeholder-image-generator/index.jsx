import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
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

function buildSvg({ width, height, bgColor, textColor, label, fontSize }) {
    const escaped = label
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${bgColor}"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${textColor}" font-family="IBM Plex Sans, Arial, sans-serif" font-size="${fontSize}" font-weight="600">${escaped}</text>
</svg>`;
}

function PlaceholderImageGenerator() {
    const [width, setWidth] = useState(600);
    const [height, setHeight] = useState(400);
    const [bgColor, setBgColor] = useState("#1e293b");
    const [textColor, setTextColor] = useState("#94a3b8");
    const [label, setLabel] = useState("");
    const [fontSize, setFontSize] = useState(32);
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

    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        canvas.width = safeWidth;
        canvas.height = safeHeight;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = safeBg;
        ctx.fillRect(0, 0, safeWidth, safeHeight);
        const size = clamp(fontSize, 8, Math.min(safeWidth, safeHeight) / 2);
        ctx.fillStyle = safeText;
        ctx.font = `600 ${size}px IBM Plex Sans, Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(displayLabel, safeWidth / 2, safeHeight / 2);
        return canvas;
    }, [displayLabel, fontSize, safeBg, safeHeight, safeText, safeWidth]);

    const svgPreviewUrl = useMemo(() => {
        if (format !== "svg") return "";
        const svg = buildSvg({
            width: safeWidth,
            height: safeHeight,
            bgColor: safeBg,
            textColor: safeText,
            label: displayLabel,
            fontSize: clamp(fontSize, 8, Math.min(safeWidth, safeHeight) / 2),
        });
        return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }, [displayLabel, fontSize, format, safeBg, safeHeight, safeText, safeWidth]);

    useEffect(() => {
        if (format === "svg") return;
        renderCanvas();
    }, [format, renderCanvas]);

    const exportBlob = useCallback(async () => {
        const selected = FORMATS.find((entry) => entry.id === format);
        if (!selected) return null;
        if (format === "svg") {
            const svg = buildSvg({
                width: safeWidth,
                height: safeHeight,
                bgColor: safeBg,
                textColor: safeText,
                label: displayLabel,
                fontSize: clamp(fontSize, 8, Math.min(safeWidth, safeHeight) / 2),
            });
            return new Blob([svg], { type: "image/svg+xml" });
        }
        const canvas = renderCanvas();
        if (!canvas) return null;
        return canvasToBlob(canvas, selected.mime, format === "jpg" ? 0.92 : undefined);
    }, [displayLabel, fontSize, format, renderCanvas, safeBg, safeHeight, safeText, safeWidth]);

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
                    <span className="img-tool__label">Width (px)</span>
                    <input
                        type="number"
                        className="img-tool__input"
                        min={1}
                        max={MAX_DIMENSION}
                        value={width}
                        onChange={(e) => setWidth(Number(e.target.value))}
                    />
                </div>
                <div>
                    <span className="img-tool__label">Height (px)</span>
                    <input
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
                <span className="img-tool__label">Label</span>
                <input
                    type="text"
                    className="img-tool__input"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={dimensionSummary}
                />
            </div>

            <div className="img-tool__field-row">
                <div>
                    <span className="img-tool__label">Background</span>
                    <div className="img-tool__color-row">
                        <input
                            type="color"
                            className="img-tool__color-input"
                            value={safeBg}
                            onChange={(e) => setBgColor(e.target.value)}
                        />
                        <input
                            type="text"
                            className="img-tool__input"
                            value={bgColor}
                            onChange={(e) => setBgColor(e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <span className="img-tool__label">Text color</span>
                    <div className="img-tool__color-row">
                        <input
                            type="color"
                            className="img-tool__color-input"
                            value={safeText}
                            onChange={(e) => setTextColor(e.target.value)}
                        />
                        <input
                            type="text"
                            className="img-tool__input"
                            value={textColor}
                            onChange={(e) => setTextColor(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div>
                <span className="img-tool__label">Font size</span>
                <input
                    type="range"
                    className="img-tool__range"
                    min={8}
                    max={120}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                />
                <div className="img-tool__range-meta">
                    <span>8px</span>
                    <span className="img-tool__range-value">{fontSize}px</span>
                    <span>120px</span>
                </div>
            </div>

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
        <>
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
        </>
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

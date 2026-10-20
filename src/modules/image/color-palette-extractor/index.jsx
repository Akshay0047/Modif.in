import { handleFilePickerKeyDown } from "../_shared/imageToolUtils";
import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import ImageToolRange from "../_shared/ImageToolRange";
import {copyTextToClipboard,
    downsampleImageData,
    extractDominantColors,
    formatBytes,
    IMAGE_ACCEPT,
    loadImageFromFileWithProgress,
    MB,
    paletteToCssVariables,
    paletteToJson,
    renderPaletteCard,
    rgbToHex,
    triggerDownload,
    validateStandardImage, preventDragDefaults } from "../_shared/imageToolUtils";
// preventDragDefaults imported below

const MAX_BYTES = 30 * MB;

function rgbToHslString(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    if (max === min) return `hsl(0, 0%, ${Math.round(l * 100)}%)`;
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function formatColorValue(color, format) {
    if (format === "rgb") return color.rgb;
    if (format === "hsl") return rgbToHslString(color.r, color.g, color.b);
    return color.hex;
}

function ColorPaletteExtractor() {
    const [colors, setColors] = useState([]);
    const [colorCount, setColorCount] = useState(5);
    const [colorFormat, setColorFormat] = useState("hex");
    const [fileMeta, setFileMeta] = useState(null);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [progress, setProgress] = useState(0);
    const [showProgress, setShowProgress] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [hoverHex, setHoverHex] = useState("");
    const [hasImage, setHasImage] = useState(false);
    const eyedropperSupported =
        typeof window !== "undefined" && typeof window.EyeDropper !== "undefined";
    const canvasRef = useRef(null);
    const imageRef = useRef(null);
    const objectUrlRef = useRef("");
    const fileInputRef = useRef(null);

    const revokeObjectUrl = useCallback(() => {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = "";
        }
    }, []);

    useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

    const extractPalette = useCallback((image, count) => {
        const imageData = downsampleImageData(image, 150);
        return extractDominantColors(imageData, count);
    }, []);

    const drawPreview = useCallback((image) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const maxW = 480;
        const maxH = 300;
        const scale = Math.min(maxW / image.naturalWidth, maxH / image.naturalHeight, 1);
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }, []);

    const processFile = useCallback(
        async (file) => {
            setError("");
            setStatus("");
            const validation = validateStandardImage(file, MAX_BYTES);
            if (!validation.ok) {
                setError(validation.error);
                return;
            }
            setShowProgress(true);
            setProgress(0);
            revokeObjectUrl();
            setHasImage(false);
            try {
                const loaded = await loadImageFromFileWithProgress(file, setProgress);
                objectUrlRef.current = loaded.objectUrl;
                imageRef.current = loaded.image;
                setHasImage(true);
                setFileMeta({
                    name: file.name,
                    size: file.size,
                    width: loaded.width,
                    height: loaded.height,
                });
                drawPreview(loaded.image);
                const palette = extractPalette(loaded.image, colorCount);
                setColors(palette);
                setStatus(`Extracted ${palette.length} dominant colors.`);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Could not process image.");
            } finally {
                setShowProgress(false);
            }
        },
        [colorCount, drawPreview, extractPalette, revokeObjectUrl],
    );

    useEffect(() => {
        if (!imageRef.current) return;
        const palette = extractPalette(imageRef.current, colorCount);
        setColors(palette);
    }, [colorCount, extractPalette]);

    const onCanvasMove = useCallback((event) => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (!canvas || !image) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor(
            ((event.clientX - rect.left) / rect.width) * image.naturalWidth,
        );
        const y = Math.floor(
            ((event.clientY - rect.top) / rect.height) * image.naturalHeight,
        );
        const temp = document.createElement("canvas");
        temp.width = 1;
        temp.height = 1;
        const ctx = temp.getContext("2d");
        ctx.drawImage(image, x, y, 1, 1, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        setHoverHex(rgbToHex(r, g, b));
    }, []);

    const pickFromScreen = useCallback(async () => {
        if (!window.EyeDropper) {
            setError("EyeDropper API is not supported in this browser.");
            return;
        }
        try {
            const dropper = new window.EyeDropper();
            const result = await dropper.open();
            setStatus(`Picked ${result.sRGBHex}`);
            setColors((prev) => [
                {
                    hex: result.sRGBHex,
                    rgb: result.sRGBHex,
                    r: parseInt(result.sRGBHex.slice(1, 3), 16),
                    g: parseInt(result.sRGBHex.slice(3, 5), 16),
                    b: parseInt(result.sRGBHex.slice(5, 7), 16),
                    count: 1,
                },
                ...prev.filter((c) => c.hex !== result.sRGBHex).slice(0, colorCount - 1),
            ]);
        } catch {
            setStatus("Eyedropper cancelled.");
        }
    }, [colorCount]);

    const copyColor = useCallback(async (value) => {
        try {
            await copyTextToClipboard(value);
            setStatus(`Copied ${value}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Copy failed.");
        }
    }, []);

    const exportJson = useCallback(async () => {
        if (!colors.length) return;
        try {
            await copyTextToClipboard(paletteToJson(colors));
            setStatus("Palette JSON copied.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Export failed.");
        }
    }, [colors]);

    const exportCss = useCallback(async () => {
        if (!colors.length) return;
        const css = `:root {\n${paletteToCssVariables(colors)}\n}`;
        try {
            await copyTextToClipboard(css);
            setStatus("CSS variables copied.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Export failed.");
        }
    }, [colors]);

    const exportPalettePng = useCallback(async () => {
        if (!colors.length) return;
        setShowProgress(true);
        setProgress(50);
        try {
            const blob = await renderPaletteCard(colors);
            triggerDownload(blob, "palette.png");
            setStatus("Palette card downloaded.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Export failed.");
        } finally {
            setShowProgress(false);
            setProgress(0);
        }
    }, [colors]);

    const left = (
        <>
            <div
                className={`img-tool__dropzone cursor-target${isDragging ? " is-dragging" : ""}`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                    preventDragDefaults(e);
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={handleFilePickerKeyDown}
                role="button"
                tabIndex={0}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={IMAGE_ACCEPT}
                    className="img-tool__dropzone-input"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) processFile(file);
                    }}
                />
                <p className="img-tool__dropzone-text">
                    Drop an image or click to browse
                    <br />
                    <span>Max 30 MB</span>
                </p>
            </div>

            {fileMeta ? (
                <div className="img-tool__meta">
                    <span className="img-tool__chip">
                        <strong>Size</strong> {formatBytes(fileMeta.size)}
                    </span>
                    <span className="img-tool__chip">
                        <strong>Dimensions</strong> {fileMeta.width}×{fileMeta.height}
                    </span>
                </div>
            ) : null}

            <ImageToolRange
                label="Dominant colors"
                min={3}
                max={8}
                value={colorCount}
                onChange={setColorCount}
                disabled={!hasImage}
                lowLabel="3 colors"
                highLabel="8 colors"
            />

            <div>
                <span className="img-tool__label">Color format</span>
                <div className="img-tool__segmented">
                    {[
                        ["hex", "HEX"],
                        ["rgb", "RGB"],
                        ["hsl", "HSL"],
                    ].map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            className={`img-tool__segment${colorFormat === key ? " is-active" : ""}`}
                            disabled={!hasImage}
                            onClick={() => setColorFormat(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="img-tool__actions">
                <button
                    type="button"
                    className="img-tool__btn cursor-target"
                    onClick={pickFromScreen}
                    disabled={!eyedropperSupported}
                >
                    Pick Pixel (EyeDropper)
                </button>
            </div>
            {!eyedropperSupported ? (
                <p className="img-tool__hint">
                    EyeDropper API is not available in this browser. Hover the preview to sample
                    pixels instead.
                </p>
            ) : null}

            <div className="img-tool__actions">
                <button
                    type="button"
                    className="img-tool__btn cursor-target"
                    onClick={exportJson}
                    disabled={!colors.length}
                >
                    Export JSON
                </button>
                <button
                    type="button"
                    className="img-tool__btn cursor-target"
                    onClick={exportCss}
                    disabled={!colors.length}
                >
                    Export CSS
                </button>
                <button
                    type="button"
                    className="img-tool__btn img-tool__btn--primary cursor-target"
                    onClick={exportPalettePng}
                    disabled={!colors.length}
                >
                    Download Palette PNG
                </button>
            </div>
        </>
    );

    const right = (
        <>
            <div className="img-tool__canvas-wrap">
                <canvas
                    ref={canvasRef}
                    onMouseMove={onCanvasMove}
                    onMouseLeave={() => setHoverHex("")}
                />
                {hoverHex ? <span className="img-tool__pixel-badge">{hoverHex}</span> : null}
                {!hasImage ? (
                    <p className="img-tool__preview-empty">Upload an image to extract its palette.</p>
                ) : null}
            </div>

            {colors.length ? (
                <div className="img-tool__swatches">
                    {colors.map((color) => {
                        const displayValue = formatColorValue(color, colorFormat);
                        return (
                            <button
                                key={color.hex}
                                type="button"
                                className="img-tool__swatch cursor-target"
                                onClick={() => copyColor(displayValue)}
                                title={`Click to copy ${colorFormat.toUpperCase()}`}
                            >
                                <span
                                    className="img-tool__swatch-color"
                                    style={{ backgroundColor: color.hex }}
                                />
                                <span className="img-tool__swatch-meta">
                                    <span>{displayValue}</span>
                                    <span>{colorFormat.toUpperCase()}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </>
    );

    return (
        <ImageToolWorkspace
            title="Color Palette Extractor"
            error={error}
            status={status}
            left={left}
            right={right}
            progress={progress}
            progressLabel="Processing image"
            showProgress={showProgress}
        />
    );
}

export default ColorPaletteExtractor;

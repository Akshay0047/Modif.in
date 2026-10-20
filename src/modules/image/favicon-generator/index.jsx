import { handleFilePickerKeyDown } from "../_shared/imageToolUtils";
import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import ImageToolRange from "../_shared/ImageToolRange";
import {canvasToBlob,
    copyTextToClipboard,
    drawRoundedIcon,
    formatBytes,
    IMAGE_ACCEPT,
    loadImageFromFileWithProgress,
    MB,
    normalizeHexColor,
    triggerDownload,
    validateStandardImage, preventDragDefaults } from "../_shared/imageToolUtils";
// preventDragDefaults imported below

const MAX_BYTES = 15 * MB;

const FAVICON_SIZES = [
    { size: 16, name: "favicon-16x16.png" },
    { size: 32, name: "favicon-32x32.png" },
    { size: 48, name: "favicon-48x48.png" },
    { size: 180, name: "apple-touch-icon.png" },
    { size: 192, name: "android-chrome-192x192.png" },
    { size: 512, name: "android-chrome-512x512.png" },
];

const DEFAULT_SIZES = new Set([16, 32, 48, 180, 192, 512]);

const FONT_FAMILIES = [
    ["IBM Plex Sans, Arial, sans-serif", "IBM Plex Sans"],
    ["Arial, Helvetica, sans-serif", "Arial"],
    ["Georgia, Times New Roman, serif", "Georgia"],
    ["Impact, Arial Black, sans-serif", "Impact"],
    ["Courier New, Courier, monospace", "Courier New"],
];

function buildManifest(selectedSizes) {
    const icons = FAVICON_SIZES
        .filter((entry) => (entry.size === 192 || entry.size === 512) && selectedSizes.has(entry.size))
        .map((entry) => ({
            src: entry.name,
            sizes: `${entry.size}x${entry.size}`,
            type: "image/png",
        }));

    return JSON.stringify(
        {
            name: "My App",
            short_name: "App",
            icons,
            theme_color: "#ffffff",
            background_color: "#ffffff",
            display: "standalone",
        },
        null,
        2,
    );
}

function buildHtmlSnippet(selectedSizes) {
    const lines = [];
    if (selectedSizes.has(32)) {
        lines.push('<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">');
    }
    if (selectedSizes.has(16)) {
        lines.push('<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">');
    }
    if (selectedSizes.has(48)) {
        lines.push('<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">');
    }
    if (selectedSizes.has(180)) {
        lines.push('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">');
    }
    if (selectedSizes.has(192) || selectedSizes.has(512)) {
        lines.push('<link rel="manifest" href="/site.webmanifest">');
    }
    return lines.join("\n");
}

function drawLettermarkIcon(ctx, size, { letter, fontFamily, fontColor, bgColor, radiusPercent, withBackground }) {
    ctx.clearRect(0, 0, size, size);
    if (withBackground) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, size, size);
    }
    ctx.save();
    const radius = (radiusPercent / 100) * (size / 2);
    if (radius > 0 && typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(0, 0, size, size, radius);
        ctx.clip();
    }
    const char = (letter || "A").slice(0, 1).toUpperCase();
    ctx.fillStyle = fontColor;
    ctx.font = `bold ${Math.round(size * 0.56)}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(char, size / 2, size / 2 + size * 0.02);
    ctx.restore();
}

function FaviconGenerator() {
    const [sourceMode, setSourceMode] = useState("upload");
    const [letter, setLetter] = useState("M");
    const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0][0]);
    const [fontColor, setFontColor] = useState("#10b981");
    const [selectedSizes, setSelectedSizes] = useState(() => new Set(DEFAULT_SIZES));
    const [rounding, setRounding] = useState(0);
    const [withBackground, setWithBackground] = useState(true);
    const [bgColor, setBgColor] = useState("#FFFFFF");
    const [tabPreviewUrl, setTabPreviewUrl] = useState("");
    const [sourcePreviewUrl, setSourcePreviewUrl] = useState("");
    const [hasImage, setHasImage] = useState(false);
    const [fileMeta, setFileMeta] = useState(null);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [progress, setProgress] = useState(0);
    const [showProgress, setShowProgress] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const imageRef = useRef(null);
    const objectUrlRef = useRef("");
    const fileInputRef = useRef(null);

    const revokeObjectUrl = useCallback(() => {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = "";
        }
        setSourcePreviewUrl("");
        setHasImage(false);
    }, []);

    useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

    const canRender = sourceMode === "upload" ? hasImage : letter.trim().length > 0;

    const renderIcon = useCallback(
        async (size) => {
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            if (sourceMode === "lettermark") {
                drawLettermarkIcon(ctx, size, {
                    letter,
                    fontFamily,
                    fontColor: normalizeHexColor(fontColor),
                    bgColor: normalizeHexColor(bgColor),
                    radiusPercent: rounding,
                    withBackground,
                });
            } else {
                const image = imageRef.current;
                if (!image) return null;
                drawRoundedIcon(ctx, image, size, {
                    radiusPercent: rounding,
                    backgroundColor: normalizeHexColor(bgColor),
                    withBackground,
                });
            }
            return canvasToBlob(canvas, "image/png");
        },
        [bgColor, fontColor, fontFamily, letter, rounding, sourceMode, withBackground],
    );

    useEffect(() => {
        if (!canRender) return undefined;
        let cancelled = false;
        (async () => {
            const blob = await renderIcon(32);
            if (cancelled || !blob) return;
            const url = URL.createObjectURL(blob);
            setTabPreviewUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return url;
            });
        })();
        return () => {
            cancelled = true;
        };
    }, [canRender, rounding, withBackground, bgColor, renderIcon]);

    useEffect(
        () => () => {
            if (tabPreviewUrl) URL.revokeObjectURL(tabPreviewUrl);
        },
        [tabPreviewUrl],
    );

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
            try {
                const loaded = await loadImageFromFileWithProgress(file, setProgress);
                objectUrlRef.current = loaded.objectUrl;
                setSourcePreviewUrl(loaded.objectUrl);
                imageRef.current = loaded.image;
                setHasImage(true);
                setFileMeta({ name: file.name, size: file.size });
                setStatus("Source image loaded. Configure sizes and download.");
            } catch (err) {
                setError(err instanceof Error ? err.message : "Could not load image.");
            } finally {
                setShowProgress(false);
            }
        },
        [revokeObjectUrl],
    );

    const toggleSize = useCallback((size) => {
        setSelectedSizes((prev) => {
            const next = new Set(prev);
            if (next.has(size)) next.delete(size);
            else next.add(size);
            return next;
        });
    }, []);

    const downloadZip = useCallback(async () => {
        if (!canRender || selectedSizes.size === 0) return;
        setShowProgress(true);
        setProgress(10);
        try {
            const JSZip = (await import("jszip")).default;
            const zip = new JSZip();
            const sizes = FAVICON_SIZES.filter((entry) => selectedSizes.has(entry.size));
            let done = 0;
            for (const entry of sizes) {
                const blob = await renderIcon(entry.size);
                if (blob) zip.file(entry.name, blob);
                done += 1;
                setProgress(10 + Math.round((done / sizes.length) * 70));
            }
            zip.file("site.webmanifest", buildManifest(selectedSizes));
            setProgress(90);
            const zipBlob = await zip.generateAsync({ type: "blob" });
            triggerDownload(zipBlob, "favicon-pack.zip");
            setStatus("Favicon ZIP downloaded.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "ZIP export failed.");
        } finally {
            setShowProgress(false);
            setProgress(0);
        }
    }, [canRender, renderIcon, selectedSizes]);

    const copyHtml = useCallback(async () => {
        try {
            await copyTextToClipboard(buildHtmlSnippet(selectedSizes));
            setStatus("HTML snippet copied.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Copy failed.");
        }
    }, [selectedSizes]);

    const left = (
        <>
            <div>
                <span className="img-tool__label">Source mode</span>
                <div className="img-tool__segmented">
                    {[
                        ["upload", "Upload Image"],
                        ["lettermark", "Create Lettermark"],
                    ].map(([key, label]) => (
                        <button aria-pressed={sourceMode === key}
                            key={key}
                            type="button"
                            className={`img-tool__segment${sourceMode === key ? " is-active" : ""}`}
                            onClick={() => setSourceMode(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {sourceMode === "upload" ? (
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
                        aria-label="Upload icon"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) processFile(file);
                        }}
                    />
                    <p className="img-tool__dropzone-text">
                        Upload a square logo or icon
                        <br />
                        <span>PNG, JPG, WEBP — max 15 MB</span>
                    </p>
                </div>
            ) : (
                <>
                    <div>
                        <label className="img-tool__label" htmlFor="fav-letter">Letter</label>
                        <input
                            id="fav-letter"
                            className="img-tool__input"
                            type="text"
                            maxLength={1}
                            value={letter}
                            onChange={(e) => setLetter(e.target.value.slice(0, 1))}
                            placeholder="M"
                        />
                    </div>
                    <div>
                        <label className="img-tool__label" htmlFor="fav-font">Font family</label>
                        <select
                            id="fav-font"
                            className="img-tool__select"
                            value={fontFamily}
                            onChange={(e) => setFontFamily(e.target.value)}
                        >
                            {FONT_FAMILIES.map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="img-tool__field-row">
                        <div className="img-tool__color-row">
                            <input
                                type="color"
                                className="img-tool__color-input"
                                value={fontColor}
                                onChange={(e) => setFontColor(e.target.value)}
                                aria-label="Letter color"
                            />
                            <span className="img-tool__hint">Letter color</span>
                        </div>
                        <div className="img-tool__color-row">
                            <input
                                type="color"
                                className="img-tool__color-input"
                                value={bgColor}
                                onChange={(e) => setBgColor(e.target.value)}
                                aria-label="Background color"
                            />
                            <span className="img-tool__hint">Background</span>
                        </div>
                    </div>
                </>
            )}

            {fileMeta && sourceMode === "upload" ? (
                <div className="img-tool__meta">
                    <span className="img-tool__chip">
                        <strong>File</strong> {fileMeta.name}
                    </span>
                    <span className="img-tool__chip">
                        <strong>Size</strong> {formatBytes(fileMeta.size)}
                    </span>
                </div>
            ) : null}

            <div>
                <span className="img-tool__label">Icon sizes</span>
                <div className="img-tool__checkbox-grid">
                    {FAVICON_SIZES.map((entry) => (
                        <label key={entry.size}>
                            <input
                                type="checkbox"
                                checked={selectedSizes.has(entry.size)}
                                onChange={() => toggleSize(entry.size)}
                            />
                            {entry.size}×{entry.size}
                        </label>
                    ))}
                </div>
            </div>

            <ImageToolRange
                label="Corner rounding"
                min={0}
                max={50}
                value={rounding}
                onChange={setRounding}
                disabled={!canRender}
                unit="%"
                lowLabel="Square"
                highLabel="Round"
            />

            {sourceMode === "upload" && (
                <label className="img-tool__checkbox-row">
                    <input
                        type="checkbox"
                        checked={withBackground}
                        onChange={(e) => setWithBackground(e.target.checked)}
                        disabled={!canRender}
                    />
                    Fill background color
                </label>
            )}

            {withBackground && sourceMode === "upload" ? (
                <div className="img-tool__color-row">
                    <input
                        type="color"
                        className="img-tool__color-input"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        disabled={!canRender}
                        aria-label="Background color"
                    />
                    <input
                        type="text"
                        className="img-tool__input"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        disabled={!canRender}
                        aria-label="Background hex value"
                    />
                </div>
            ) : null}

            <div className="img-tool__actions">
                <button
                    type="button"
                    className="img-tool__btn img-tool__btn--primary cursor-target"
                    onClick={downloadZip}
                    disabled={!canRender || selectedSizes.size === 0}
                >
                    Download Favicon ZIP
                </button>
                <button
                    type="button"
                    className="img-tool__btn cursor-target"
                    onClick={copyHtml}
                    disabled={!canRender}
                >
                    Copy HTML Snippet
                </button>
            </div>
        </>
    );

    const right = (
        <>
            <div className="img-tool__favicon-mockup">
                <span className="img-tool__label">Browser tab preview</span>
                <div className="img-tool__favicon-tabbar">
                    <div className="img-tool__favicon-tab">
                        {tabPreviewUrl ? (
                            <img src={tabPreviewUrl} alt="" />
                        ) : (
                            <span
                                style={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: 2,
                                    background: "#334155",
                                    display: "inline-block",
                                }}
                            />
                        )}
                        My Website
                    </div>
                </div>
                <div className="img-tool__favicon-content" />
            </div>

            <div className="img-tool__preview-frame">
                {sourceMode === "upload" && sourcePreviewUrl ? (
                    <img
                        src={sourcePreviewUrl}
                        alt="Source preview"
                        className="img-tool__preview-image"
                    />
                ) : sourceMode === "lettermark" && tabPreviewUrl ? (
                    <img
                        src={tabPreviewUrl}
                        alt="Lettermark preview"
                        className="img-tool__preview-image"
                        style={{ maxWidth: 180, margin: "0 auto" }}
                    />
                ) : (
                    <p className="img-tool__preview-empty">
                        {sourceMode === "upload"
                            ? "Upload an image to generate favicon assets."
                            : "Enter a letter to generate a typography favicon."}
                    </p>
                )}
            </div>
        </>
    );

    return (
        <ImageToolWorkspace
            title="Favicon Generator"
            error={error}
            status={status}
            left={left}
            right={right}
            progress={progress}
            progressLabel="Generating favicons"
            showProgress={showProgress}
        />
    );
}

export default FaviconGenerator;

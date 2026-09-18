import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import {
    IMAGE_ACCEPT,
    canvasToBlob,
    createCanvas,
    formatBytes,
    loadImageFromFileWithProgress,
    triggerDownload,
    validateStandardImage,
    preventDragDefaults,
} from "../_shared/imageToolUtils";

const DEVICE_GROUPS = {
    Phones: {
        iphone15pro: {
            label: "iPhone 15 Pro",
            screenRatio: 9 / 19.5,
            bezel: 12,
            corner: 34,
            type: "phone",
            variant: "dynamic-island",
            maxW: 520,
        },
        galaxys24: {
            label: "Samsung Galaxy S24",
            screenRatio: 9 / 20,
            bezel: 10,
            corner: 28,
            type: "phone",
            variant: "hole-punch",
            maxW: 500,
        },
    },
    Tablets: {
        ipadpro: {
            label: "iPad Pro",
            screenRatio: 4 / 3,
            bezel: 18,
            corner: 20,
            type: "tablet",
            maxW: 900,
        },
        tablet: {
            label: "Generic Tablet",
            screenRatio: 16 / 10,
            bezel: 20,
            corner: 16,
            type: "tablet",
            maxW: 860,
        },
    },
    Desktop: {
        macbookpro: {
            label: "MacBook Pro",
            screenRatio: 16 / 10,
            bezel: 20,
            corner: 10,
            type: "laptop",
            base: 18,
            maxW: 1200,
        },
        imac: {
            label: "iMac",
            screenRatio: 16 / 10,
            bezel: 16,
            corner: 14,
            type: "imac",
            chin: 44,
            maxW: 1100,
        },
        browserMac: {
            label: "Browser — macOS",
            screenRatio: 16 / 10,
            bezel: 0,
            corner: 10,
            type: "browser-macos",
            barH: 38,
            maxW: 1200,
        },
        browserWin: {
            label: "Browser — Windows 11",
            screenRatio: 16 / 10,
            bezel: 0,
            corner: 8,
            type: "browser-windows",
            barH: 44,
            maxW: 1200,
        },
    },
    Watches: {
        applewatch: {
            label: "Apple Watch",
            screenRatio: 4 / 5,
            bezel: 10,
            corner: 28,
            type: "watch",
            maxW: 360,
        },
    },
};

const DEVICES = Object.fromEntries(
    Object.values(DEVICE_GROUPS).flatMap((group) => Object.entries(group)),
);

function drawBackdrop(ctx, w, h, style, color) {
    if (style === "transparent") return;
    if (style === "solid") {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, w, h);
        return;
    }
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(0.5, "#1e3a5f");
    grad.addColorStop(1, "#064e3b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
}

function roundRect(ctx, x, y, w, h, r, topOnly = false) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (topOnly) {
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
    } else {
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
    }
    ctx.closePath();
}

function drawDeviceFrame(ctx, deviceKey, device, theme, x, y, w, h) {
    const isDark = theme === "dark";
    const body = isDark ? "#1f2937" : "#e5e7eb";
    const accent = isDark ? "#374151" : "#d1d5db";

    ctx.save();
    ctx.fillStyle = body;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, device.corner);
    ctx.fill();
    ctx.stroke();

    if (device.type === "browser-macos") {
        const barH = device.barH || 38;
        ctx.fillStyle = isDark ? "#111827" : "#f3f4f6";
        roundRect(ctx, x, y, w, barH, device.corner, true);
        ctx.fill();
        const dotY = y + barH / 2;
        ["#ef4444", "#f59e0b", "#22c55e"].forEach((color, i) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x + 16 + i * 14, dotY, 5, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.fillStyle = isDark ? "#4b5563" : "#d1d5db";
        roundRect(ctx, x + w * 0.22, y + barH * 0.22, w * 0.56, barH * 0.56, 6);
        ctx.fill();
    }

    if (device.type === "browser-windows") {
        const barH = device.barH || 44;
        ctx.fillStyle = isDark ? "#0f172a" : "#f8fafc";
        roundRect(ctx, x, y, w, barH, device.corner, true);
        ctx.fill();
        ctx.strokeStyle = isDark ? "#334155" : "#e2e8f0";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + barH);
        ctx.lineTo(x + w, y + barH);
        ctx.stroke();
        ctx.fillStyle = isDark ? "#1e293b" : "#ffffff";
        roundRect(ctx, x + 14, y + 10, w * 0.62, barH - 20, 8);
        ctx.fill();
        ctx.strokeStyle = isDark ? "#475569" : "#cbd5e1";
        ctx.stroke();
        const controls = ["─", "□", "×"];
        controls.forEach((_, i) => {
            ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
            ctx.fillRect(x + w - 22 - i * 18, y + 14, 12, 12);
        });
    }

    if (device.variant === "dynamic-island") {
        const islandW = w * 0.32;
        const islandH = 14;
        ctx.fillStyle = "#000000";
        roundRect(ctx, x + (w - islandW) / 2, y + 10, islandW, islandH, 8);
        ctx.fill();
    }

    if (device.variant === "hole-punch") {
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(x + w / 2, y + 16, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    if (device.type === "laptop") {
        const baseH = device.base || 16;
        ctx.fillStyle = isDark ? "#111827" : "#d1d5db";
        roundRect(ctx, x - w * 0.04, y + h, w * 1.08, baseH, 4);
        ctx.fill();
    }

    if (device.type === "imac") {
        const chin = device.chin || 40;
        ctx.fillStyle = isDark ? "#111827" : "#e5e7eb";
        ctx.fillRect(x, y + h - chin, w, chin);
        ctx.fillStyle = isDark ? "#374151" : "#cbd5e1";
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h + chin * 0.35, chin * 0.22, 0, Math.PI * 2);
        ctx.fill();
    }

    if (device.type === "watch") {
        ctx.fillStyle = isDark ? "#4b5563" : "#9ca3af";
        roundRect(ctx, x + w - 4, y + h * 0.28, 6, h * 0.18, 3);
        ctx.fill();
    }

    ctx.restore();
}

function getFrameExtras(device) {
    if (device.type === "browser-macos" || device.type === "browser-windows") {
        return { barOffset: device.barH || 40, chinOffset: 0, baseOffset: 0 };
    }
    if (device.type === "imac") return { barOffset: 0, chinOffset: device.chin || 40, baseOffset: 0 };
    if (device.type === "laptop") return { barOffset: 0, chinOffset: 0, baseOffset: device.base || 16 };
    return { barOffset: 0, chinOffset: 0, baseOffset: 0 };
}

function renderMockup(image, options) {
    const { deviceKey, theme, padding, shadow, backdrop, backdropColor } = options;
    const device = DEVICES[deviceKey];
    const { barOffset, chinOffset, baseOffset } = getFrameExtras(device);
    const maxW = device.maxW || 1200;
    const screenW = maxW - padding * 2 - device.bezel * 2;
    const screenH = screenW / device.screenRatio;
    const frameW = screenW + device.bezel * 2;
    const frameH = screenH + device.bezel * 2 + barOffset + chinOffset;
    const canvasW = frameW + padding * 2;
    const canvasH = frameH + padding * 2 + baseOffset;

    const { canvas, ctx } = createCanvas(canvasW, canvasH);
    drawBackdrop(ctx, canvasW, canvasH, backdrop, backdropColor);

    const fx = padding;
    const fy = padding;

    if (shadow > 0) {
        ctx.save();
        ctx.shadowColor = `rgba(0,0,0,${shadow / 100})`;
        ctx.shadowBlur = 30 + shadow * 0.5;
        ctx.shadowOffsetY = 12;
        roundRect(ctx, fx, fy, frameW, frameH, device.corner);
        ctx.fillStyle = "rgba(0,0,0,0.01)";
        ctx.fill();
        ctx.restore();
    }

    drawDeviceFrame(ctx, deviceKey, device, theme, fx, fy, frameW, frameH);

    const inset = device.bezel;
    const sx = fx + inset;
    const sy = fy + inset + barOffset;
    const sw = frameW - inset * 2;
    const sh = frameH - inset * 2 - barOffset - chinOffset;

    ctx.save();
    roundRect(ctx, sx, sy, sw, sh, Math.max(4, device.corner - 6));
    ctx.clip();
    const imgRatio = image.naturalWidth / image.naturalHeight;
    const areaRatio = sw / sh;
    let dw;
    let dh;
    let dx;
    let dy;
    if (imgRatio > areaRatio) {
        dh = sh;
        dw = dh * imgRatio;
        dx = sx + (sw - dw) / 2;
        dy = sy;
    } else {
        dw = sw;
        dh = dw / imgRatio;
        dx = sx;
        dy = sy + (sh - dh) / 2;
    }
    ctx.drawImage(image, dx, dy, dw, dh);
    ctx.restore();

    return canvas;
}

function DeviceMockupGenerator() {
    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    const sourceRef = useRef(null);
    const operationRef = useRef(0);

    const [file, setFile] = useState(null);
    const [sourceImage, setSourceImage] = useState(null);
    const [device, setDevice] = useState("macbookpro");
    const [theme, setTheme] = useState("dark");
    const [padding, setPadding] = useState(40);
    const [shadow, setShadow] = useState(60);
    const [backdrop, setBackdrop] = useState("gradient");
    const [backdropColor, setBackdropColor] = useState("#0f172a");
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [showProgress, setShowProgress] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState("");

    const releaseSource = useCallback(() => {
        if (sourceRef.current?.objectUrl) URL.revokeObjectURL(sourceRef.current.objectUrl);
        sourceRef.current = null;
    }, []);

    const resetTool = useCallback(() => {
        operationRef.current += 1;
        releaseSource();
        setFile(null);
        setSourceImage(null);
        setError("");
        setStatus("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [releaseSource]);

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
            setProgressLabel("Loading image...");
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

    const paint = useCallback(() => {
        if (!sourceImage || !canvasRef.current) return;
        const canvas = renderMockup(sourceImage, {
            deviceKey: device,
            theme,
            padding,
            shadow,
            backdrop,
            backdropColor,
        });
        const display = canvasRef.current;
        display.width = canvas.width;
        display.height = canvas.height;
        const ctx = display.getContext("2d");
        ctx.drawImage(canvas, 0, 0);
    }, [sourceImage, device, theme, padding, shadow, backdrop, backdropColor]);

    useEffect(() => {
        paint();
    }, [paint]);

    useEffect(
        () => () => {
            operationRef.current += 1;
            releaseSource();
        },
        [releaseSource],
    );

    const handleExport = async () => {
        if (!sourceImage) return;
        setShowProgress(true);
        setProgressLabel("Exporting PNG...");
        setProgress(50);
        try {
            const canvas = renderMockup(sourceImage, {
                deviceKey: device,
                theme,
                padding,
                shadow,
                backdrop,
                backdropColor,
            });
            const blob = await canvasToBlob(canvas, "image/png");
            const base = file?.name?.replace(/\.[^.]+$/, "") || "mockup";
            triggerDownload(blob, `${base}-mockup.png`);
            setStatus("PNG exported.");
            setProgress(100);
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
                <span className="img-tool__label">Device frame</span>
                <select
                    className="img-tool__select"
                    value={device}
                    disabled={!hasImage}
                    onChange={(e) => setDevice(e.target.value)}
                >
                    {Object.entries(DEVICE_GROUPS).map(([group, devices]) => (
                        <optgroup key={group} label={group}>
                            {Object.entries(devices).map(([key, d]) => (
                                <option key={key} value={key}>{d.label}</option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>

            <div>
                <span className="img-tool__label">Theme</span>
                <div className="img-tool__segmented">
                    {["dark", "light"].map((t) => (
                        <button
                            key={t}
                            type="button"
                            className={`img-tool__segment${theme === t ? " is-active" : ""}`}
                            disabled={!hasImage}
                            onClick={() => setTheme(t)}
                        >
                            {t === "dark" ? "Dark" : "Light"}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="img-tool__label" htmlFor="mock-padding">Padding</label>
                <input
                    id="mock-padding"
                    className="img-tool__range"
                    type="range"
                    min={10}
                    max={100}
                    value={padding}
                    disabled={!hasImage}
                    onChange={(e) => setPadding(Number(e.target.value))}
                />
                <div className="img-tool__range-meta">
                    <span>10px</span>
                    <span className="img-tool__range-value">{padding}px</span>
                    <span>100px</span>
                </div>
            </div>

            <div>
                <label className="img-tool__label" htmlFor="mock-shadow">Shadow</label>
                <input
                    id="mock-shadow"
                    className="img-tool__range"
                    type="range"
                    min={0}
                    max={100}
                    value={shadow}
                    disabled={!hasImage}
                    onChange={(e) => setShadow(Number(e.target.value))}
                />
            </div>

            <div>
                <span className="img-tool__label">Backdrop</span>
                <div className="img-tool__segmented">
                    {[
                        ["gradient", "Gradient"],
                        ["solid", "Solid"],
                        ["transparent", "None"],
                    ].map(([val, label]) => (
                        <button
                            key={val}
                            type="button"
                            className={`img-tool__segment${backdrop === val ? " is-active" : ""}`}
                            disabled={!hasImage}
                            onClick={() => setBackdrop(val)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {backdrop === "solid" && (
                <div className="img-tool__color-row">
                    <input
                        className="img-tool__color-input"
                        type="color"
                        value={backdropColor}
                        disabled={!hasImage}
                        onChange={(e) => setBackdropColor(e.target.value)}
                    />
                    <span className="img-tool__hint">Background color</span>
                </div>
            )}

            <div className="img-tool__actions">
                <button
                    type="button"
                    className="img-tool__btn img-tool__btn--primary"
                    disabled={!hasImage}
                    onClick={handleExport}
                >
                    Export PNG
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
                    preventDragDefaults(e); setIsDragging(true);
                }}
                onDragOver={preventDragDefaults}
                onDragLeave={(e) => {
                    preventDragDefaults(e); if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
                }}
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
                    {file ? `${file.name} (${formatBytes(file.size)})` : "Drop a screenshot to wrap in a device frame"}
                </p>
            </div>

            <div className="img-tool__canvas-wrap">
                {hasImage ? (
                    <canvas ref={canvasRef} aria-label="Mockup preview" />
                ) : (
                    <p className="img-tool__preview-empty">Upload an image to preview mockup</p>
                )}
            </div>
        </>
    );

    return (
        <ImageToolWorkspace
            title="Device Mockup Generator"
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

export default DeviceMockupGenerator;

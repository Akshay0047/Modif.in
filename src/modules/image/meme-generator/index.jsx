import { handleFilePickerKeyDown } from "../_shared/imageToolUtils";
import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import ImageToolRange from "../_shared/ImageToolRange";
import {
    IMAGE_ACCEPT,
    canvasToBlob,
    clamp,
    createCanvas,
    formatBytes,
    loadImageFromFileWithProgress,
    loadImageFromUrl,
    triggerDownload,
    validateStandardImage,
    preventDragDefaults,
} from "../_shared/imageToolUtils";

const FONT_FAMILIES = [
    ["Impact, Arial Black, sans-serif", "Impact"],
    ["Arial, Helvetica, sans-serif", "Arial"],
    ["Georgia, Times New Roman, serif", "Georgia"],
    ["Courier New, Courier, monospace", "Courier New"],
    ["IBM Plex Sans, sans-serif", "IBM Plex Sans"],
    ["Comic Sans MS, cursive", "Comic Sans"],
];

const BUILTIN_STICKERS = [
    { key: "thug-glasses", label: "Thug Life Glasses" },
    { key: "deal-with-it", label: "Deal With It" },
    { key: "emoji-fire", label: "Fire" },
    { key: "emoji-laugh", label: "Laugh" },
    { key: "emoji-cool", label: "Cool" },
    { key: "emoji-100", label: "100" },
];

let layerCounter = 0;
function createLayerId(prefix) {
    layerCounter += 1;
    return `${prefix}-${layerCounter}`;
}

function createTextLayer(overrides = {}) {
    return {
        id: createLayerId("text"),
        text: "",
        x: 50,
        y: 15,
        fontFamily: FONT_FAMILIES[0][0],
        fontSize: 48,
        fillColor: "#FFFFFF",
        strokeColor: "#000000",
        shadowBlur: 0,
        shadowColor: "#000000",
        allCaps: true,
        ...overrides,
    };
}

function createStickerLayer(overrides = {}) {
    return {
        id: createLayerId("sticker"),
        type: "builtin",
        builtin: "thug-glasses",
        emoji: "",
        image: null,
        x: 50,
        y: 50,
        scale: 1,
        width: 200,
        height: 80,
        ...overrides,
    };
}

function wrapText(ctx, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    }
    if (line) lines.push(line);
    return lines;
}

function drawTextLayer(ctx, layer, canvasW, canvasH, imageOffset) {
    if (!layer.text.trim()) return;
    const content = layer.allCaps ? layer.text.toUpperCase() : layer.text;
    const size = layer.fontSize;
    ctx.save();
    ctx.font = `bold ${size}px ${layer.fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = Math.max(2, size / 12);
    ctx.strokeStyle = layer.strokeColor;
    ctx.fillStyle = layer.fillColor;
    if (layer.shadowBlur > 0) {
        ctx.shadowColor = layer.shadowColor;
        ctx.shadowBlur = layer.shadowBlur;
        ctx.shadowOffsetX = Math.max(1, layer.shadowBlur / 6);
        ctx.shadowOffsetY = Math.max(1, layer.shadowBlur / 6);
    }
    const x = imageOffset.x + (layer.x / 100) * (canvasW - imageOffset.x * 2);
    const y = imageOffset.y + (layer.y / 100) * (canvasH - imageOffset.y * 2);
    const maxW = (canvasW - imageOffset.x * 2) * 0.92;
    const lines = wrapText(ctx, content, maxW);
    const lineHeight = size * 1.15;
    const blockH = lines.length * lineHeight;
    lines.forEach((ln, i) => {
        const ly = y - blockH / 2 + i * lineHeight + lineHeight / 2;
        ctx.strokeText(ln, x, ly);
        ctx.fillText(ln, x, ly);
    });
    ctx.restore();
}

function drawBuiltinSticker(ctx, key, cx, cy, scale) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    if (key === "thug-glasses") {
        ctx.fillStyle = "#111111";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 4;
        ctx.fillRect(-90, -18, 70, 36);
        ctx.fillRect(20, -18, 70, 36);
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(20, 0);
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(-82, -10, 54, 20);
        ctx.fillRect(28, -10, 54, 20);
    } else if (key === "deal-with-it") {
        ctx.fillStyle = "#111111";
        ctx.fillRect(-95, -20, 55, 30);
        ctx.fillRect(40, -20, 55, 30);
        ctx.strokeStyle = "#222";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-40, -5);
        ctx.lineTo(40, -5);
        ctx.stroke();
    } else if (key.startsWith("emoji-")) {
        const emojiMap = {
            "emoji-fire": "🔥",
            "emoji-laugh": "😂",
            "emoji-cool": "😎",
            "emoji-100": "💯",
        };
        ctx.font = "96px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(emojiMap[key] || "✨", 0, 8);
    }
    ctx.restore();
}

function drawStickerLayer(ctx, layer, canvasW, canvasH, imageOffset) {
    const cx = imageOffset.x + (layer.x / 100) * (canvasW - imageOffset.x * 2);
    const cy = imageOffset.y + (layer.y / 100) * (canvasH - imageOffset.y * 2);
    if (layer.type === "image" && layer.image) {
        const w = layer.width * layer.scale;
        const h = layer.height * layer.scale;
        ctx.drawImage(layer.image, cx - w / 2, cy - h / 2, w, h);
        return;
    }
    drawBuiltinSticker(ctx, layer.builtin, cx, cy, layer.scale);
}

function drawMeme(image, options) {
    const {
        backgroundPadding,
        backgroundColor,
        textLayers,
        stickerLayers,
    } = options;

    const imgW = image.naturalWidth;
    const imgH = image.naturalHeight;
    const pad = backgroundPadding;
    const { canvas: c, ctx } = createCanvas(imgW + pad * 2, imgH + pad * 2);

    if (pad > 0) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, c.width, c.height);
    }

    ctx.drawImage(image, pad, pad, imgW, imgH);
    const offset = { x: pad, y: pad };

    stickerLayers.forEach((layer) => drawStickerLayer(ctx, layer, c.width, c.height, offset));
    textLayers.forEach((layer) => drawTextLayer(ctx, layer, c.width, c.height, offset));

    return c;
}

function MemeGenerator() {
    const fileInputRef = useRef(null);
    const stickerInputRef = useRef(null);
    const canvasRef = useRef(null);
    const sourceRef = useRef(null);
    const dragRef = useRef(null);
    const operationRef = useRef(0);

    const [file, setFile] = useState(null);
    const [sourceImage, setSourceImage] = useState(null);
    const [textLayers, setTextLayers] = useState([
        createTextLayer({ text: "", y: 12 }),
        createTextLayer({ text: "", y: 88 }),
    ]);
    const [stickerLayers, setStickerLayers] = useState([]);
    const [activeTextId, setActiveTextId] = useState(null);
    const [activeStickerId, setActiveStickerId] = useState(null);
    const [backgroundPadding, setBackgroundPadding] = useState(0);
    const [backgroundColor, setBackgroundColor] = useState("#000000");
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [showProgress, setShowProgress] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState("");

    const activeText = textLayers.find((l) => l.id === activeTextId) || textLayers[0];
    const activeSticker = stickerLayers.find((l) => l.id === activeStickerId);

    const releaseSource = useCallback(() => {
        if (sourceRef.current?.objectUrl) URL.revokeObjectURL(sourceRef.current.objectUrl);
        sourceRef.current = null;
    }, []);

    const resetTool = useCallback(() => {
        operationRef.current += 1;
        releaseSource();
        setFile(null);
        setSourceImage(null);
        const top = createTextLayer({ text: "", y: 12 });
        const bottom = createTextLayer({ text: "", y: 88 });
        setTextLayers([top, bottom]);
        setStickerLayers([]);
        setActiveTextId(top.id);
        setActiveStickerId(null);
        setBackgroundPadding(0);
        setBackgroundColor("#000000");
        setError("");
        setStatus("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (stickerInputRef.current) stickerInputRef.current.value = "";
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
                if (!activeTextId) setActiveTextId(textLayers[0]?.id);
                setShowProgress(false);
            } catch (err) {
                setError(err.message);
                setShowProgress(false);
            }
        },
        [releaseSource, activeTextId, textLayers],
    );

    const updateTextLayer = (id, patch) => {
        setTextLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    };

    const updateStickerLayer = (id, patch) => {
        setStickerLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    };

    const addTextLayer = () => {
        const layer = createTextLayer({ y: 50 });
        setTextLayers((prev) => [...prev, layer]);
        setActiveTextId(layer.id);
    };

    const removeTextLayer = (id) => {
        setTextLayers((prev) => {
            if (prev.length <= 1) return prev;
            const next = prev.filter((l) => l.id !== id);
            if (activeTextId === id) setActiveTextId(next[0]?.id || null);
            return next;
        });
    };

    const addBuiltinSticker = (builtinKey) => {
        const layer = createStickerLayer({
            type: "builtin",
            builtin: builtinKey,
            scale: builtinKey.startsWith("emoji-") ? 0.8 : 1,
        });
        setStickerLayers((prev) => [...prev, layer]);
        setActiveStickerId(layer.id);
    };

    const ingestSticker = async (nextFile) => {
        const validation = validateStandardImage(nextFile, 5 * 1024 * 1024);
        if (!validation.ok) {
            setError(validation.error);
            return;
        }
        try {
            const url = URL.createObjectURL(nextFile);
            const loaded = await loadImageFromUrl(url);
            const layer = createStickerLayer({
                type: "image",
                image: loaded.image,
                width: loaded.image.naturalWidth,
                height: loaded.image.naturalHeight,
                scale: Math.min(1, 240 / Math.max(loaded.image.naturalWidth, loaded.image.naturalHeight)),
            });
            setStickerLayers((prev) => [...prev, layer]);
            setActiveStickerId(layer.id);
        } catch (err) {
            setError(err.message);
        }
    };

    const removeStickerLayer = (id) => {
        setStickerLayers((prev) => prev.filter((l) => l.id !== id));
        if (activeStickerId === id) setActiveStickerId(null);
    };

    const paint = useCallback(() => {
        if (!sourceImage || !canvasRef.current) return;
        const canvas = drawMeme(sourceImage, {
            backgroundPadding,
            backgroundColor,
            textLayers,
            stickerLayers,
        });
        const display = canvasRef.current;
        display.width = canvas.width;
        display.height = canvas.height;
        const ctx = display.getContext("2d");
        ctx.drawImage(canvas, 0, 0);
    }, [sourceImage, backgroundPadding, backgroundColor, textLayers, stickerLayers]);

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

    const getCanvasPos = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const pad = backgroundPadding;
        const innerW = canvas.width - pad * 2;
        const innerH = canvas.height - pad * 2;
        const rawX = (e.clientX - rect.left) * scaleX;
        const rawY = (e.clientY - rect.top) * scaleY;
        const x = ((rawX - pad) / innerW) * 100;
        const y = ((rawY - pad) / innerH) * 100;
        return { x: clamp(x, 0, 100), y: clamp(y, 0, 100) };
    };

    const findDragTarget = (pos) => {
        let best = null;
        let bestDist = Infinity;
        stickerLayers.forEach((layer) => {
            const dist = Math.hypot(pos.x - layer.x, pos.y - layer.y);
            if (dist < bestDist) {
                bestDist = dist;
                best = { kind: "sticker", id: layer.id };
            }
        });
        textLayers.forEach((layer) => {
            const dist = Math.hypot(pos.x - layer.x, pos.y - layer.y);
            if (dist < bestDist) {
                bestDist = dist;
                best = { kind: "text", id: layer.id };
            }
        });
        return bestDist <= 18 ? best : null;
    };

    const handlePointerDown = (e) => {
        if (!sourceImage) return;
        const pos = getCanvasPos(e);
        if (!pos) return;
        const target = findDragTarget(pos);
        if (target) {
            dragRef.current = target;
            if (target.kind === "text") setActiveTextId(target.id);
            else setActiveStickerId(target.id);
        } else {
            dragRef.current = { kind: "text", id: activeText?.id || textLayers[0]?.id };
        }
        canvasRef.current.setPointerCapture(e.pointerId);
        if (dragRef.current.kind === "text") {
            updateTextLayer(dragRef.current.id, pos);
        } else {
            updateStickerLayer(dragRef.current.id, pos);
        }
    };

    const handlePointerMove = (e) => {
        if (!dragRef.current) return;
        const pos = getCanvasPos(e);
        if (!pos) return;
        if (dragRef.current.kind === "text") {
            updateTextLayer(dragRef.current.id, pos);
        } else {
            updateStickerLayer(dragRef.current.id, pos);
        }
    };

    const handlePointerUp = (e) => {
        dragRef.current = null;
        canvasRef.current?.releasePointerCapture(e.pointerId);
    };

    const handleDownload = async () => {
        if (!sourceImage) return;
        setShowProgress(true);
        setProgressLabel("Exporting...");
        try {
            const canvas = drawMeme(sourceImage, {
                backgroundPadding,
                backgroundColor,
                textLayers,
                stickerLayers,
            });
            const blob = await canvasToBlob(canvas, "image/png");
            const base = file?.name?.replace(/\.[^.]+$/, "") || "meme";
            triggerDownload(blob, `${base}-meme.png`);
            setStatus("Meme downloaded.");
        } catch (err) {
            setError(err.message);
        } finally {
            setShowProgress(false);
        }
    };

    const hasImage = Boolean(sourceImage);
    const selectedText = activeText || textLayers[0];

    const left = (
        <>
            <div>
                <span className="img-tool__label">Text boxes</span>
                <div className="img-tool__segmented" style={{ flexWrap: "wrap" }}>
                    {textLayers.map((layer, index) => (
                        <button
                            key={layer.id}
                            type="button"
                            className={`img-tool__segment${selectedText?.id === layer.id ? " is-active" : ""}`}
                            disabled={!hasImage}
                            onClick={() => setActiveTextId(layer.id)}
                        >
                            Text {index + 1}
                        </button>
                    ))}
                    <button
                        type="button"
                        className="img-tool__segment"
                        disabled={!hasImage}
                        onClick={addTextLayer}
                    >
                        + Add
                    </button>
                </div>
            </div>

            {selectedText && (
                <>
                    <div>
                        <label className="img-tool__label" htmlFor="meme-text">Text</label>
                        <input
                            id="meme-text"
                            className="img-tool__input"
                            type="text"
                            value={selectedText.text}
                            disabled={!hasImage}
                            placeholder="YOUR TEXT HERE"
                            onChange={(e) => updateTextLayer(selectedText.id, { text: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="img-tool__label" htmlFor="meme-font">Font family</label>
                        <select
                            id="meme-font"
                            className="img-tool__select"
                            value={selectedText.fontFamily}
                            disabled={!hasImage}
                            onChange={(e) => updateTextLayer(selectedText.id, { fontFamily: e.target.value })}
                        >
                            {FONT_FAMILIES.map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <ImageToolRange
                        id="meme-size"
                        label="Font size"
                        min={16}
                        max={120}
                        value={selectedText.fontSize}
                        disabled={!hasImage}
                        onChange={(val) => updateTextLayer(selectedText.id, { fontSize: val })}
                        unit="px"
                        lowLabel="16px"
                        highLabel="120px"
                    />
                    <div className="img-tool__field-row">
                        <div className="img-tool__color-row">
                            <input
                                className="img-tool__color-input"
                                type="color"
                                value={selectedText.fillColor}
                                disabled={!hasImage}
                                onChange={(e) => updateTextLayer(selectedText.id, { fillColor: e.target.value })}
                                aria-label="Text color"
                            />
                            <span className="img-tool__hint">Text</span>
                        </div>
                        <div className="img-tool__color-row">
                            <input
                                className="img-tool__color-input"
                                type="color"
                                value={selectedText.strokeColor}
                                disabled={!hasImage}
                                onChange={(e) => updateTextLayer(selectedText.id, { strokeColor: e.target.value })}
                                aria-label="Stroke color"
                            />
                            <span className="img-tool__hint">Stroke</span>
                        </div>
                    </div>
                    <ImageToolRange
                        id="meme-shadow"
                        label="Text shadow"
                        min={0}
                        max={30}
                        value={selectedText.shadowBlur}
                        disabled={!hasImage}
                        onChange={(val) => updateTextLayer(selectedText.id, { shadowBlur: val })}
                        unit="px"
                        lowLabel="None"
                        highLabel="Glow"
                    />
                    {selectedText.shadowBlur > 0 && (
                        <div className="img-tool__color-row">
                            <input
                                className="img-tool__color-input"
                                type="color"
                                value={selectedText.shadowColor}
                                disabled={!hasImage}
                                onChange={(e) => updateTextLayer(selectedText.id, { shadowColor: e.target.value })}
                                aria-label="Shadow color"
                            />
                            <span className="img-tool__hint">Shadow color</span>
                        </div>
                    )}
                    <label className="img-tool__checkbox-row">
                        <input
                            type="checkbox"
                            checked={selectedText.allCaps}
                            disabled={!hasImage}
                            onChange={(e) => updateTextLayer(selectedText.id, { allCaps: e.target.checked })}
                        />
                        ALL CAPS
                    </label>
                    {textLayers.length > 1 && (
                        <button
                            type="button"
                            className="img-tool__btn"
                            disabled={!hasImage}
                            onClick={() => removeTextLayer(selectedText.id)}
                        >
                            Remove text box
                        </button>
                    )}
                </>
            )}

            <div>
                <span className="img-tool__label">Stickers & overlays</span>
                <div className="img-tool__segmented" style={{ flexWrap: "wrap" }}>
                    {BUILTIN_STICKERS.map((sticker) => (
                        <button
                            key={sticker.key}
                            type="button"
                            className="img-tool__segment"
                            disabled={!hasImage}
                            onClick={() => addBuiltinSticker(sticker.key)}
                        >
                            {sticker.label}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    className="img-tool__btn"
                    style={{ marginTop: "0.5rem" }}
                    disabled={!hasImage}
                    onClick={() => stickerInputRef.current?.click()}
                >
                    Upload sticker image
                </button>
                <input
                    ref={stickerInputRef}
                    className="img-tool__dropzone-input"
                    type="file"
                    accept={IMAGE_ACCEPT}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) ingestSticker(f); }}
                />
            </div>

            {activeSticker && (
                <div>
                    <ImageToolRange
                        id="meme-sticker-scale"
                        label="Sticker scale"
                        min={0.2}
                        max={3}
                        step={0.05}
                        value={activeSticker.scale}
                        disabled={!hasImage}
                        onChange={(val) => updateStickerLayer(activeSticker.id, { scale: val })}
                        formatDisplay={(val) => `${val.toFixed(2)}×`}
                    />
                    <button
                        type="button"
                        className="img-tool__btn"
                        disabled={!hasImage}
                        onClick={() => removeStickerLayer(activeSticker.id)}
                    >
                        Remove sticker
                    </button>
                </div>
            )}

            <ImageToolRange
                id="meme-padding"
                label="Background padding"
                min={0}
                max={120}
                value={backgroundPadding}
                disabled={!hasImage}
                onChange={setBackgroundPadding}
                unit="px"
                lowLabel="None"
                highLabel="Poster"
            />
            {backgroundPadding > 0 && (
                <div className="img-tool__color-row">
                    <input
                        className="img-tool__color-input"
                        type="color"
                        value={backgroundColor}
                        disabled={!hasImage}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        aria-label="Background color"
                    />
                    <span className="img-tool__hint">Border / poster background</span>
                </div>
            )}

            <p className="img-tool__hint">Drag text boxes and stickers on the preview to position them freely.</p>
            <div className="img-tool__actions">
                <button
                    type="button"
                    className="img-tool__btn img-tool__btn--primary"
                    disabled={!hasImage}
                    onClick={handleDownload}
                >
                    Download Meme
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
                onKeyDown={handleFilePickerKeyDown}
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
                    {file ? `${file.name} (${formatBytes(file.size)})` : "Drop an image to make a meme"}
                </p>
            </div>
            <div className="img-tool__canvas-wrap">
                {hasImage ? (
                    <canvas
                        ref={canvasRef}
                        aria-label="Meme preview — drag to move layers"
                        style={{ cursor: "grab", touchAction: "none" }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                    />
                ) : (
                    <p className="img-tool__preview-empty">Upload an image to start</p>
                )}
            </div>
        </>
    );

    return (
        <ImageToolWorkspace
            title="Meme Generator"
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

export default MemeGenerator;

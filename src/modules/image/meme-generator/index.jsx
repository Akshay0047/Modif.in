import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import {IMAGE_ACCEPT,
    canvasToBlob,
    clamp,
    createCanvas,
    formatBytes,
    loadImageFromFileWithProgress,
    triggerDownload,
    validateStandardImage, preventDragDefaults } from "../_shared/imageToolUtils";
// preventDragDefaults imported below

const FONT_STACK = 'Impact, "Arial Black", sans-serif';

function drawMeme(image, { topText, bottomText, fontSize, allCaps, fillColor, strokeColor, topPos, bottomPos }) {
    const { canvas: c, ctx } = createCanvas(image.naturalWidth, image.naturalHeight);
    ctx.drawImage(image, 0, 0);

    const renderText = (text, pos, isTop) => {
        if (!text.trim()) return;
        const content = allCaps ? text.toUpperCase() : text;
        const size = fontSize;
        ctx.font = `bold ${size}px ${FONT_STACK}`;
        ctx.textAlign = "center";
        ctx.textBaseline = isTop ? "top" : "bottom";
        ctx.lineWidth = Math.max(2, size / 12);
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = fillColor;
        const x = (pos.x / 100) * c.width;
        const y = (pos.y / 100) * c.height;
        const maxW = c.width * 0.92;
        const words = content.split(" ");
        const lines = [];
        let line = "";
        for (const word of words) {
            const test = line ? `${line} ${word}` : word;
            if (ctx.measureText(test).width > maxW && line) {
                lines.push(line);
                line = word;
            } else {
                line = test;
            }
        }
        if (line) lines.push(line);
        const lineHeight = size * 1.15;
        lines.forEach((ln, i) => {
            const ly = isTop ? y + i * lineHeight : y - (lines.length - 1 - i) * lineHeight;
            ctx.strokeText(ln, x, ly);
            ctx.fillText(ln, x, ly);
        });
    };

    renderText(topText, topPos, true);
    renderText(bottomText, bottomPos, false);
    return c;
}

function MemeGenerator() {
    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    const sourceRef = useRef(null);
    const dragRef = useRef(null);
    const operationRef = useRef(0);

    const [file, setFile] = useState(null);
    const [sourceImage, setSourceImage] = useState(null);
    const [topText, setTopText] = useState("");
    const [bottomText, setBottomText] = useState("");
    const [fontSize, setFontSize] = useState(48);
    const [allCaps, setAllCaps] = useState(true);
    const [fillColor, setFillColor] = useState("#FFFFFF");
    const [strokeColor, setStrokeColor] = useState("#000000");
    const [topPos, setTopPos] = useState({ x: 50, y: 5 });
    const [bottomPos, setBottomPos] = useState({ x: 50, y: 95 });
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
        setTopText("");
        setBottomText("");
        setTopPos({ x: 50, y: 5 });
        setBottomPos({ x: 50, y: 95 });
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

    const paint = useCallback(() => {
        if (!sourceImage || !canvasRef.current) return;
        const canvas = drawMeme(sourceImage, {
            topText,
            bottomText,
            fontSize,
            allCaps,
            fillColor,
            strokeColor,
            topPos,
            bottomPos,
        });
        const display = canvasRef.current;
        display.width = canvas.width;
        display.height = canvas.height;
        const ctx = display.getContext("2d");
        ctx.drawImage(canvas, 0, 0);
    }, [sourceImage, topText, bottomText, fontSize, allCaps, fillColor, strokeColor, topPos, bottomPos]);

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
        const x = ((e.clientX - rect.left) * scaleX / canvas.width) * 100;
        const y = ((e.clientY - rect.top) * scaleY / canvas.height) * 100;
        return { x: clamp(x, 5, 95), y: clamp(y, 5, 95) };
    };

    const handlePointerDown = (e) => {
        if (!sourceImage) return;
        const pos = getCanvasPos(e);
        if (!pos) return;
        const distTop = Math.hypot(pos.x - topPos.x, pos.y - topPos.y);
        const distBottom = Math.hypot(pos.x - bottomPos.x, pos.y - bottomPos.y);
        dragRef.current = distTop <= distBottom ? "top" : "bottom";
        canvasRef.current.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!dragRef.current) return;
        const pos = getCanvasPos(e);
        if (!pos) return;
        if (dragRef.current === "top") setTopPos(pos);
        else setBottomPos(pos);
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
                topText,
                bottomText,
                fontSize,
                allCaps,
                fillColor,
                strokeColor,
                topPos,
                bottomPos,
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

    const left = (
        <>
            <div>
                <label className="img-tool__label" htmlFor="meme-top">Top text</label>
                <input
                    id="meme-top"
                    className="img-tool__input"
                    type="text"
                    value={topText}
                    disabled={!hasImage}
                    placeholder="TOP TEXT"
                    onChange={(e) => setTopText(e.target.value)}
                />
            </div>
            <div>
                <label className="img-tool__label" htmlFor="meme-bottom">Bottom text</label>
                <input
                    id="meme-bottom"
                    className="img-tool__input"
                    type="text"
                    value={bottomText}
                    disabled={!hasImage}
                    placeholder="BOTTOM TEXT"
                    onChange={(e) => setBottomText(e.target.value)}
                />
            </div>
            <div>
                <label className="img-tool__label" htmlFor="meme-size">Font size</label>
                <input
                    id="meme-size"
                    className="img-tool__range"
                    type="range"
                    min={16}
                    max={120}
                    value={fontSize}
                    disabled={!hasImage}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                />
                <div className="img-tool__range-meta">
                    <span>16px</span>
                    <span className="img-tool__range-value">{fontSize}px</span>
                    <span>120px</span>
                </div>
            </div>
            <label className="img-tool__checkbox-row">
                <input
                    type="checkbox"
                    checked={allCaps}
                    disabled={!hasImage}
                    onChange={(e) => setAllCaps(e.target.checked)}
                />
                ALL CAPS
            </label>
            <div className="img-tool__field-row">
                <div className="img-tool__color-row">
                    <input
                        className="img-tool__color-input"
                        type="color"
                        value={fillColor}
                        disabled={!hasImage}
                        onChange={(e) => setFillColor(e.target.value)}
                        aria-label="Fill color"
                    />
                    <span className="img-tool__hint">Fill</span>
                </div>
                <div className="img-tool__color-row">
                    <input
                        className="img-tool__color-input"
                        type="color"
                        value={strokeColor}
                        disabled={!hasImage}
                        onChange={(e) => setStrokeColor(e.target.value)}
                        aria-label="Stroke color"
                    />
                    <span className="img-tool__hint">Stroke</span>
                </div>
            </div>
            <p className="img-tool__hint">Drag text on the preview to reposition.</p>
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
                    {file ? `${file.name} (${formatBytes(file.size)})` : "Drop an image to make a meme"}
                </p>
            </div>
            <div className="img-tool__canvas-wrap">
                {hasImage ? (
                    <canvas
                        ref={canvasRef}
                        aria-label="Meme preview — drag to move text"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
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

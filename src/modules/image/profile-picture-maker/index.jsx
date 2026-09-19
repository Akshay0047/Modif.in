import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import ImageToolRange from "../_shared/ImageToolRange";
import {
    MB,
    IMAGE_ACCEPT,
    formatBytes,
    validateStandardImage,
    loadImageFromFileWithProgress,
    canvasToBlob,
    triggerDownload,
    copyBlobToClipboard,
    replaceExtension,
    normalizeHexColor,
    waitFrame,
    preventDragDefaults,
} from "../_shared/imageToolUtils";

const MAX_BYTES = 30 * MB;
const SNAP_THRESHOLD = 10;

function degToRad(degrees) {
    return (degrees * Math.PI) / 180;
}

function drawPipAvatar(canvas, image, options) {
    const {
        outputSize,
        bgColor,
        panX,
        panY,
        scale,
        rotation,
        snapGuides,
    } = options;

    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    const center = outputSize / 2;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, outputSize, outputSize);

    if (snapGuides?.vertical || snapGuides?.horizontal) {
        ctx.save();
        ctx.strokeStyle = "rgba(16, 185, 129, 0.9)";
        ctx.lineWidth = Math.max(1, outputSize / 320);
        ctx.setLineDash([6, 4]);
        if (snapGuides.vertical) {
            ctx.beginPath();
            ctx.moveTo(center, 0);
            ctx.lineTo(center, outputSize);
            ctx.stroke();
        }
        if (snapGuides.horizontal) {
            ctx.beginPath();
            ctx.moveTo(0, center);
            ctx.lineTo(outputSize, center);
            ctx.stroke();
        }
        ctx.restore();
    }

    const containScale = Math.min(outputSize / image.width, outputSize / image.height);
    const drawScale = containScale * scale;
    const drawW = image.width * drawScale;
    const drawH = image.height * drawScale;

    ctx.save();
    ctx.translate(center + panX, center + panY);
    ctx.rotate(degToRad(rotation));
    ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
}

function snapPan(pan) {
    const guides = { vertical: false, horizontal: false };
    let x = pan.x;
    let y = pan.y;

    if (Math.abs(x) <= SNAP_THRESHOLD) {
        x = 0;
        guides.vertical = true;
    }
    if (Math.abs(y) <= SNAP_THRESHOLD) {
        y = 0;
        guides.horizontal = true;
    }

    return { pan: { x, y }, guides };
}

export default function ProfilePictureMakerTool() {
    const fileInputRef = useRef(null);
    const previewCanvasRef = useRef(null);
    const sourceRef = useRef(null);
    const operationRef = useRef(0);
    const dragRef = useRef(null);

    const [file, setFile] = useState(null);
    const [imageSize, setImageSize] = useState(null);
    const [bgColor, setBgColor] = useState("#1e293b");
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [snapGuides, setSnapGuides] = useState({ vertical: false, horizontal: false });
    const [outputSize, setOutputSize] = useState(512);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const options = useMemo(
        () => ({
            outputSize,
            bgColor: normalizeHexColor(bgColor),
            panX: pan.x,
            panY: pan.y,
            scale,
            rotation,
            snapGuides,
        }),
        [outputSize, bgColor, pan.x, pan.y, scale, rotation, snapGuides],
    );

    const releaseSource = useCallback(() => {
        if (sourceRef.current?.objectUrl) URL.revokeObjectURL(sourceRef.current.objectUrl);
        sourceRef.current = null;
    }, []);

    const resetAll = useCallback(() => {
        operationRef.current += 1;
        releaseSource();
        setFile(null);
        setImageSize(null);
        setPan({ x: 0, y: 0 });
        setScale(1);
        setRotation(0);
        setSnapGuides({ vertical: false, horizontal: false });
        setBgColor("#1e293b");
        setError("");
        setStatus("");
        setProgress(0);
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [releaseSource]);

    const ingestFile = useCallback(
        async (nextFile) => {
            const validation = validateStandardImage(nextFile, MAX_BYTES);
            if (!validation.ok) {
                setError(validation.error);
                return;
            }
            const op = operationRef.current + 1;
            operationRef.current = op;
            releaseSource();
            setError("");
            setStatus("");
            setIsProcessing(true);
            setProgress(0);
            try {
                const loaded = await loadImageFromFileWithProgress(nextFile, (p) => {
                    if (operationRef.current === op) setProgress(p);
                });
                if (operationRef.current !== op) {
                    URL.revokeObjectURL(loaded.objectUrl);
                    return;
                }
                sourceRef.current = loaded;
                setFile(nextFile);
                setImageSize({ width: loaded.width, height: loaded.height });
                setPan({ x: 0, y: 0 });
                setScale(1);
                setRotation(0);
                setSnapGuides({ vertical: true, horizontal: true });
            } catch (e) {
                if (operationRef.current === op) setError(e.message || "Failed to load image.");
            } finally {
                if (operationRef.current === op) {
                    setIsProcessing(false);
                    setProgress(0);
                }
            }
        },
        [releaseSource],
    );

    const drawPreview = useCallback(() => {
        const canvas = previewCanvasRef.current;
        const src = sourceRef.current;
        if (!canvas || !src?.image) return;
        drawPipAvatar(canvas, src.image, { ...options, outputSize: 320 });
        canvas.style.width = "280px";
        canvas.style.height = "280px";
    }, [options]);

    useEffect(() => {
        drawPreview();
    }, [drawPreview]);

    const handlePointerDown = (e) => {
        if (!imageSize) return;
        dragRef.current = { startX: e.clientX, startY: e.clientY, startPan: { ...pan } };
    };

    const handlePointerMove = (e) => {
        const d = dragRef.current;
        if (!d) return;
        const previewScale = 320 / outputSize;
        const rawPan = {
            x: d.startPan.x + (e.clientX - d.startX) / previewScale,
            y: d.startPan.y + (e.clientY - d.startY) / previewScale,
        };
        const { pan: nextPan, guides } = snapPan(rawPan);
        setPan(nextPan);
        setSnapGuides(guides);
    };

    const handlePointerUp = () => {
        dragRef.current = null;
    };

    useEffect(() => {
        const onMove = (e) => handlePointerMove(e);
        const onUp = () => handlePointerUp();
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        return () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
    });

    const renderOutput = async () => {
        const src = sourceRef.current;
        if (!src?.image) throw new Error("Load an image first.");
        const canvas = document.createElement("canvas");
        drawPipAvatar(canvas, src.image, { ...options, snapGuides: null });
        await waitFrame();
        return canvasToBlob(canvas, "image/png");
    };

    const handleDownload = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        setProgress(50);
        setError("");
        try {
            const blob = await renderOutput();
            triggerDownload(blob, replaceExtension(file?.name || "avatar", "png"));
            setStatus("Avatar download started.");
            setProgress(100);
        } catch (e) {
            setError(e.message || "Download failed.");
        } finally {
            setIsProcessing(false);
            setTimeout(() => setProgress(0), 400);
        }
    };

    const handleCopy = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        setError("");
        try {
            const blob = await renderOutput();
            await copyBlobToClipboard(blob);
            setStatus("Avatar copied to clipboard.");
        } catch (e) {
            setError(e.message || "Copy failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCenterImage = () => {
        setPan({ x: 0, y: 0 });
        setSnapGuides({ vertical: true, horizontal: true });
    };

    const left = (
        <>
            <label
                className={`img-tool__dropzone${isDraggingFile ? " is-dragging" : ""}${isProcessing ? " is-disabled" : ""}`}
                onDragEnter={(e) => {
                    preventDragDefaults(e);
                    if (!isProcessing) setIsDraggingFile(true);
                }}
                onDragOver={preventDragDefaults}
                onDragLeave={(e) => {
                    preventDragDefaults(e);
                    if (!e.currentTarget.contains(e.relatedTarget)) setIsDraggingFile(false);
                }}
                onDrop={(e) => {
                    preventDragDefaults(e);
                    setIsDraggingFile(false);
                    if (!isProcessing && e.dataTransfer.files?.[0]) ingestFile(e.dataTransfer.files[0]);
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={IMAGE_ACCEPT}
                    className="img-tool__dropzone-input"
                    disabled={isProcessing}
                    onChange={(e) => e.target.files?.[0] && ingestFile(e.target.files[0])}
                />
                <p className="img-tool__dropzone-text">Drop a photo (max 30 MB)</p>
            </label>
            {file && imageSize ? (
                <div className="img-tool__meta">
                    <span className="img-tool__chip"><strong>{file.name}</strong></span>
                    <span className="img-tool__chip">{imageSize.width}×{imageSize.height}</span>
                    <span className="img-tool__chip">{formatBytes(file.size)}</span>
                </div>
            ) : null}

            <div className="img-tool__controls-scroll">
                <div>
                    <span className="img-tool__label">Canvas background</span>
                    <div className="img-tool__color-row">
                        <input
                            type="color"
                            className="img-tool__color-input cursor-target"
                            value={bgColor}
                            disabled={!imageSize}
                            onChange={(e) => setBgColor(e.target.value)}
                            aria-label="Canvas background color"
                        />
                        <input
                            className="img-tool__input"
                            value={bgColor}
                            disabled={!imageSize}
                            onChange={(e) => setBgColor(normalizeHexColor(e.target.value, bgColor))}
                            aria-label="Canvas background hex value"
                        />
                    </div>
                </div>

                <ImageToolRange
                    label="Image scale"
                    min={0.2}
                    max={3}
                    step={0.01}
                    value={scale}
                    disabled={!imageSize}
                    onChange={setScale}
                    formatDisplay={(val) => `${val.toFixed(2)}×`}
                    lowLabel="Smaller"
                    highLabel="Larger"
                />

                <ImageToolRange
                    label="Rotation"
                    min={-180}
                    max={180}
                    step={0.1}
                    value={rotation}
                    disabled={!imageSize}
                    onChange={setRotation}
                    formatDisplay={(val) => `${val.toFixed(1)}°`}
                    lowLabel="-180°"
                    highLabel="180°"
                />

                <div>
                    <span className="img-tool__label">Output size</span>
                    <div className="img-tool__segmented">
                        {[512, 1024].map((s) => (
                            <button
                                key={s}
                                type="button"
                                className={`img-tool__segment${outputSize === s ? " is-active" : ""}`}
                                disabled={!imageSize}
                                onClick={() => setOutputSize(s)}
                            >
                                {s}px
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    type="button"
                    className="img-tool__btn"
                    disabled={!imageSize}
                    onClick={handleCenterImage}
                >
                    Center image
                </button>

                <p className="img-tool__hint">
                    Place your photo on a 1:1 canvas. Drag to reposition — it snaps to center with guide lines.
                    Scale and rotate to crop or straighten without cutting the image out.
                </p>
            </div>

            <div className="img-tool__actions">
                <button type="button" className="img-tool__btn img-tool__btn--primary" disabled={!imageSize || isProcessing} onClick={handleDownload}>
                    Download Avatar
                </button>
                <button type="button" className="img-tool__btn" disabled={!imageSize || isProcessing} onClick={handleCopy}>
                    Copy
                </button>
                <button type="button" className="img-tool__btn" disabled={!imageSize || isProcessing} onClick={resetAll}>
                    Reset
                </button>
            </div>
        </>
    );

    const right = (
        <div className="img-tool__preview-frame" style={{ maxHeight: "min(50vh, 380px)" }}>
            {imageSize ? (
                <canvas
                    ref={previewCanvasRef}
                    className="img-tool__preview-canvas"
                    style={{ cursor: "grab" }}
                    onPointerDown={handlePointerDown}
                />
            ) : (
                <p className="img-tool__preview-empty">Upload a photo to compose a 1:1 profile picture</p>
            )}
        </div>
    );

    return (
        <ImageToolWorkspace
            title="Profile Picture Maker"
            error={error}
            status={status}
            left={left}
            right={right}
            showProgress={isProcessing || progress > 0}
            progress={progress}
            progressLabel="Loading image"
        />
    );
}

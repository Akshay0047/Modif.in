import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import ImageToolRange from "../_shared/ImageToolRange";
import {MB,
    canvasToBlob,
    formatBytes,
    readFileWithProgress,
    replaceExtension,
    triggerDownload,
    validateFile,
    waitFrame, preventDragDefaults } from "../_shared/imageToolUtils";
// preventDragDefaults imported below

const MAX_BYTES = 30 * MB;

function validateGifFile(file) {
    return validateFile(file, {
        maxBytes: MAX_BYTES,
        extensions: [/\.gif$/i],
        mimes: new Set(["image/gif"]),
        sizeMessage: "File exceeds 30 MB limit.",
        typeMessage: "Unsupported file type. Please upload a GIF file.",
    });
}

function renderFrameOnCanvas(frames, gif, frameIndex) {
    const canvas = document.createElement("canvas");
    canvas.width = gif.lsd.width;
    canvas.height = gif.lsd.height;
    const ctx = canvas.getContext("2d");

    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    let frameImageData = null;

    for (let i = 0; i <= frameIndex; i += 1) {
        const frame = frames[i];

        if (frame.disposalType === 2) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        const dims = frame.dims;
        if (
            !frameImageData ||
            dims.width !== frameImageData.width ||
            dims.height !== frameImageData.height
        ) {
            tempCanvas.width = dims.width;
            tempCanvas.height = dims.height;
            frameImageData = tempCtx.createImageData(dims.width, dims.height);
        }

        frameImageData.data.set(frame.patch);
        tempCtx.putImageData(frameImageData, 0, 0);
        ctx.drawImage(tempCanvas, dims.left, dims.top);
    }

    return canvas;
}

function frameFps(delayMs) {
    if (!delayMs || delayMs <= 0) return "—";
    return `${(1000 / delayMs).toFixed(1)} fps`;
}

function GifFrameExtractorConverter() {
    const fileInputRef = useRef(null);
    const frameUrlsRef = useRef([]);
    const playTimerRef = useRef(null);
    const operationRef = useRef(0);

    const [file, setFile] = useState(null);
    const [frames, setFrames] = useState([]);
    const [gifMeta, setGifMeta] = useState(null);
    const [frameUrls, setFrameUrls] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [outputFormat, setOutputFormat] = useState("png");
    const [isDragging, setIsDragging] = useState(false);
    const [stage, setStage] = useState("");
    const [progress, setProgress] = useState(0);
    const [showProgress, setShowProgress] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [isZipping, setIsZipping] = useState(false);

    const revokeFrameUrls = useCallback(() => {
        frameUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        frameUrlsRef.current = [];
        setFrameUrls([]);
    }, []);

    const stopPlayback = useCallback(() => {
        if (playTimerRef.current) {
            clearTimeout(playTimerRef.current);
            playTimerRef.current = null;
        }
        setIsPlaying(false);
    }, []);

    const resetTool = useCallback(() => {
        operationRef.current += 1;
        stopPlayback();
        revokeFrameUrls();
        setFile(null);
        setFrames([]);
        setGifMeta(null);
        setCurrentIndex(0);
        setError("");
        setStatus("");
        setStage("");
        setProgress(0);
        setShowProgress(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [revokeFrameUrls, stopPlayback]);

    const processGif = useCallback(
        async (nextFile) => {
            const validation = validateGifFile(nextFile);
            if (!validation.ok) {
                setError(validation.error);
                return;
            }

            const operationId = operationRef.current + 1;
            operationRef.current = operationId;

            stopPlayback();
            revokeFrameUrls();
            setFile(nextFile);
            setFrames([]);
            setGifMeta(null);
            setCurrentIndex(0);
            setError("");
            setStatus("");
            setShowProgress(true);
            setStage("Reading GIF...");
            setProgress(5);

            try {
                const buffer = await readFileWithProgress(nextFile, (pct) => {
                    if (operationRef.current !== operationId) return;
                    setProgress(Math.round(pct * 0.2));
                });

                if (operationRef.current !== operationId) return;

                const { parseGIF, decompressFrames } = await import("gifuct-js");
                const gif = parseGIF(buffer);
                const decompressed = decompressFrames(gif, true);

                if (operationRef.current !== operationId) return;

                setStage(`Decompressing frames (0 of ${decompressed.length})...`);
                setProgress(25);
                await waitFrame();

                const urls = [];
                for (let i = 0; i < decompressed.length; i += 1) {
                    if (operationRef.current !== operationId) return;
                    setStage(`Decompressing frames (${i + 1} of ${decompressed.length})...`);
                    setProgress(25 + Math.round(((i + 1) / decompressed.length) * 45));

                    const canvas = renderFrameOnCanvas(decompressed, gif, i);
                    const mime = "image/png";
                    const blob = await canvasToBlob(canvas, mime);
                    const url = URL.createObjectURL(blob);
                    urls.push(url);
                    frameUrlsRef.current.push(url);
                }

                if (operationRef.current !== operationId) {
                    urls.forEach((url) => URL.revokeObjectURL(url));
                    return;
                }

                setStage("Rendering...");
                setProgress(85);
                await waitFrame();

                setFrames(decompressed);
                setGifMeta(gif);
                setFrameUrls(urls);
                setStage("Complete");
                setProgress(100);
                setStatus(
                    decompressed.length === 1
                        ? "Static GIF detected (1 frame)."
                        : `${decompressed.length} frames ready.`,
                );
            } catch (parseError) {
                if (operationRef.current !== operationId) return;
                setError(parseError.message || "Could not parse GIF.");
                setShowProgress(false);
                setProgress(0);
            }
        },
        [revokeFrameUrls, stopPlayback],
    );

    useEffect(() => {
        if (!isPlaying || !frames.length) return undefined;

        const delay = Math.max(20, frames[currentIndex]?.delay || 100);
        playTimerRef.current = setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % frames.length);
        }, delay);

        return () => {
            if (playTimerRef.current) clearTimeout(playTimerRef.current);
        };
    }, [isPlaying, currentIndex, frames]);

    useEffect(
        () => () => {
            operationRef.current += 1;
            stopPlayback();
            revokeFrameUrls();
        },
        [revokeFrameUrls, stopPlayback],
    );

    const exportFrameBlob = async (index) => {
        if (!frames.length || !gifMeta) return null;
        const canvas = renderFrameOnCanvas(frames, gifMeta, index);
        const mime = outputFormat === "jpg" ? "image/jpeg" : "image/png";
        const quality = outputFormat === "jpg" ? 0.92 : undefined;
        return canvasToBlob(canvas, mime, quality);
    };

    const handleDownloadCurrent = async () => {
        if (!frames.length || isZipping) return;
        try {
            const blob = await exportFrameBlob(currentIndex);
            if (!blob || !file) return;
            const base = replaceExtension(file.name, "");
            const ext = outputFormat === "jpg" ? "jpg" : "png";
            triggerDownload(blob, `${base}-frame-${currentIndex + 1}.${ext}`);
            setStatus(`Downloaded frame ${currentIndex + 1}.`);
        } catch (downloadError) {
            setError(downloadError.message || "Download failed.");
        }
    };

    const handleDownloadAll = async () => {
        if (!frames.length || isZipping) return;

        setIsZipping(true);
        setError("");
        setShowProgress(true);
        setStage("Rendering frames for ZIP...");
        setProgress(20);

        try {
            const JSZip = (await import("jszip")).default;
            const zip = new JSZip();
            const ext = outputFormat === "jpg" ? "jpg" : "png";
            const base = file ? replaceExtension(file.name, "") : "gif";

            for (let i = 0; i < frames.length; i += 1) {
                setProgress(20 + Math.round(((i + 1) / frames.length) * 70));
                const blob = await exportFrameBlob(i);
                zip.file(`${base}-frame-${String(i + 1).padStart(3, "0")}.${ext}`, blob);
            }

            const zipBlob = await zip.generateAsync({ type: "blob" });
            triggerDownload(zipBlob, `${base}-frames.zip`);
            setProgress(100);
            setStage("Complete");
            setStatus(`Downloaded ZIP with ${frames.length} frame(s).`);
        } catch (zipError) {
            setError(zipError.message || "Could not create ZIP.");
        } finally {
            setIsZipping(false);
        }
    };

    const currentFrame = frames[currentIndex];
    const previewUrl = frameUrls[currentIndex] || "";

    const left = (
        <>
            <div>
                <label className="img-tool__label" htmlFor="gif-format">Output format</label>
                <select
                    id="gif-format"
                    className="img-tool__select"
                    value={outputFormat}
                    disabled={isZipping}
                    onChange={(e) => setOutputFormat(e.target.value)}
                >
                    <option value="png">PNG</option>
                    <option value="jpg">JPG</option>
                </select>
            </div>

            {frames.length === 1 && (
                <p className="img-tool__notice">
                    This GIF appears to be static — only 1 frame was found.
                </p>
            )}

            <div className="img-tool__actions">
                <button
                    type="button"
                    className="img-tool__btn img-tool__btn--primary cursor-target"
                    disabled={!frames.length || isZipping}
                    onClick={handleDownloadCurrent}
                >
                    Download Current Frame
                </button>
                <button
                    type="button"
                    className="img-tool__btn cursor-target"
                    disabled={!frames.length || isZipping}
                    onClick={handleDownloadAll}
                >
                    Download All ZIP
                </button>
                <button
                    type="button"
                    className="img-tool__btn cursor-target"
                    disabled={!file || isZipping}
                    onClick={resetTool}
                >
                    Reset
                </button>
            </div>
        </>
    );

    const right = (
        <>
            <div
                className={`img-tool__dropzone${isDragging ? " is-dragging" : ""}${isZipping ? " is-disabled" : ""}`}
                onDragEnter={(e) => {
                    preventDragDefaults(e);
                    if (!isZipping) setIsDragging(true);
                }}
                onDragOver={preventDragDefaults}
                onDragLeave={(e) => {
                    preventDragDefaults(e);
                    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
                }}
                onDrop={(e) => {
                    preventDragDefaults(e);
                    setIsDragging(false);
                    const nextFile = e.dataTransfer.files?.[0];
                    if (nextFile) processGif(nextFile);
                }}
                onClick={() => {
                    if (!isZipping) fileInputRef.current?.click();
                }}
                role="button"
                tabIndex={0}
            >
                <input
                    ref={fileInputRef}
                    className="img-tool__dropzone-input"
                    type="file"
                    accept="image/gif,.gif"
                    disabled={isZipping}
                    onChange={(e) => {
                        const nextFile = e.target.files?.[0];
                        if (nextFile) processGif(nextFile);
                    }}
                />
                <p className="img-tool__dropzone-text">
                    {file ? (
                        <>
                            <span style={{ color: "#f8fafc", fontWeight: 600 }}>{file.name}</span>
                            <br />
                            {formatBytes(file.size)} — drop a new GIF or click to replace
                        </>
                    ) : (
                        <>
                            Drag &amp; drop a GIF here
                            <br />
                            or click to browse — max {formatBytes(MAX_BYTES)}
                        </>
                    )}
                </p>
                <span className="img-tool__btn cursor-target">Choose GIF</span>
            </div>

            {frames.length > 0 && gifMeta && (
                <>
                    <div className="img-tool__meta">
                        <span className="img-tool__chip">
                            Frame <strong>{currentIndex + 1}</strong> of <strong>{frames.length}</strong>
                        </span>
                        <span className="img-tool__chip">
                            <strong>{gifMeta.lsd.width}</strong> × <strong>{gifMeta.lsd.height}</strong> px
                        </span>
                        {currentFrame && (
                            <>
                                <span className="img-tool__chip">
                                    Delay: <strong>{currentFrame.delay}ms</strong>
                                </span>
                                <span className="img-tool__chip">
                                    <strong>{frameFps(currentFrame.delay)}</strong>
                                </span>
                            </>
                        )}
                    </div>

                    <div className="img-tool__player">
                        <div className="img-tool__row">
                            <button
                                type="button"
                                className="img-tool__btn cursor-target"
                                disabled={frames.length < 2}
                                onClick={() => {
                                    stopPlayback();
                                    setCurrentIndex((i) => Math.max(0, i - 1));
                                }}
                            >
                                − Step
                            </button>
                            <button
                                type="button"
                                className="img-tool__btn cursor-target"
                                disabled={frames.length < 2}
                                onClick={() => setIsPlaying((p) => !p)}
                            >
                                {isPlaying ? "Pause" : "Play"}
                            </button>
                            <button
                                type="button"
                                className="img-tool__btn cursor-target"
                                disabled={frames.length < 2}
                                onClick={() => {
                                    stopPlayback();
                                    setCurrentIndex((i) => Math.min(frames.length - 1, i + 1));
                                }}
                            >
                                + Step
                            </button>
                        </div>

                        <ImageToolRange
                            label={`Frame ${currentIndex + 1} of ${frames.length}`}
                            min={0}
                            max={Math.max(0, frames.length - 1)}
                            value={currentIndex}
                            disabled={frames.length < 2}
                            onChange={(val) => {
                                stopPlayback();
                                setCurrentIndex(val);
                            }}
                            formatDisplay={(val) => `${val + 1}`}
                            showMeta={false}
                        />
                    </div>

                    <div className="img-tool__preview-frame">
                        {previewUrl ? (
                            <img
                                className="img-tool__preview-image"
                                src={previewUrl}
                                alt={`GIF frame ${currentIndex + 1}`}
                            />
                        ) : null}
                    </div>

                    <div className="img-tool__filmstrip" role="list" aria-label="Frame filmstrip">
                        {frameUrls.map((url, index) => (
                            <button
                                key={url}
                                type="button"
                                className={`img-tool__filmstrip-item cursor-target${index === currentIndex ? " is-active" : ""}`}
                                onClick={() => {
                                    stopPlayback();
                                    setCurrentIndex(index);
                                }}
                                aria-label={`Go to frame ${index + 1}`}
                            >
                                <img src={url} alt="" />
                            </button>
                        ))}
                    </div>
                </>
            )}
        </>
    );

    return (
        <ImageToolWorkspace
            title="GIF Frame Extractor & Converter"
            error={error}
            status={status}
            left={left}
            right={right}
            showProgress={showProgress && progress < 100}
            progressLabel={stage}
            progress={progress}
        />
    );
}

export default GifFrameExtractorConverter;

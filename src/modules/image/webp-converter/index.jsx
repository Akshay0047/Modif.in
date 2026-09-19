import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import ImageToolRange from "../_shared/ImageToolRange";
import {MB,
    canvasToBlob,
    copyBlobToClipboard,
    createCanvas,
    formatBytes,
    formatSavingsPercent,
    loadImageFromFileWithProgress,
    replaceExtension,
    triggerDownload,
    validateFile,
    validateStandardImage,
    waitFrame,
    IMAGE_ACCEPT, preventDragDefaults } from "../_shared/imageToolUtils";
// preventDragDefaults imported below

const STAGES = {
    IDLE: "idle",
    READING: "reading",
    RENDERING: "rendering",
    ENCODING: "encoding",
    DONE: "done",
};

const STAGE_LABELS = {
    [STAGES.READING]: "Reading file...",
    [STAGES.RENDERING]: "Rendering canvas...",
    [STAGES.ENCODING]: "Encoding WebP...",
    [STAGES.DONE]: "Complete",
};

function mapProgress(stage, readPct = 0) {
    if (stage === STAGES.READING) return Math.round(readPct * 0.3);
    if (stage === STAGES.RENDERING) return 45;
    if (stage === STAGES.ENCODING) return 75;
    if (stage === STAGES.DONE) return 100;
    return 0;
}

function validateWebpInput(file) {
    return validateFile(file, {
        maxBytes: 30 * MB,
        extensions: [/\.webp$/i],
        mimes: new Set(["image/webp"]),
        sizeMessage:
            "File exceeds 30 MB limit. Please choose a smaller image to preserve browser memory.",
        typeMessage: "Unsupported file type. Please upload a WEBP image.",
    });
}

async function convertOnCanvas(image, { mode, lossless, quality, targetFormat }) {
    const { canvas, ctx } = createCanvas(image.naturalWidth, image.naturalHeight);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    if (mode === "to-webp") {
        const q = lossless ? 1 : quality / 100;
        return canvasToBlob(canvas, "image/webp", q);
    }

    const mime = targetFormat === "jpg" ? "image/jpeg" : "image/png";
    const q = targetFormat === "jpg" ? quality / 100 : undefined;
    return canvasToBlob(canvas, mime, q);
}

function WebpConverter() {
    const fileInputRef = useRef(null);
    const sourceRef = useRef(null);
    const previewUrlRef = useRef("");
    const operationRef = useRef(0);

    const [mode, setMode] = useState("to-webp");
    const [lossless, setLossless] = useState(false);
    const [quality, setQuality] = useState(85);
    const [targetFormat, setTargetFormat] = useState("png");
    const [file, setFile] = useState(null);
    const [sourceImage, setSourceImage] = useState(null);
    const [convertedBlob, setConvertedBlob] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [dimensions, setDimensions] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [stage, setStage] = useState(STAGES.IDLE);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");

    const isProcessing =
        stage === STAGES.READING || stage === STAGES.RENDERING || stage === STAGES.ENCODING;

    const revokePreviewUrl = useCallback(() => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = "";
        }
    }, []);

    const setPreviewFromBlob = useCallback(
        (blob) => {
            revokePreviewUrl();
            const nextUrl = URL.createObjectURL(blob);
            previewUrlRef.current = nextUrl;
            setPreviewUrl(nextUrl);
        },
        [revokePreviewUrl],
    );

    const releaseSource = useCallback(() => {
        if (sourceRef.current?.objectUrl) URL.revokeObjectURL(sourceRef.current.objectUrl);
        sourceRef.current = null;
    }, []);

    const resetTool = useCallback(() => {
        operationRef.current += 1;
        releaseSource();
        revokePreviewUrl();
        setFile(null);
        setSourceImage(null);
        setConvertedBlob(null);
        setPreviewUrl("");
        setDimensions(null);
        setError("");
        setStatus("");
        setStage(STAGES.IDLE);
        setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [releaseSource, revokePreviewUrl]);

    const ingestFile = useCallback(
        async (nextFile) => {
            const validation =
                mode === "from-webp"
                    ? validateWebpInput(nextFile)
                    : validateStandardImage(nextFile);

            if (!validation.ok) {
                setError(validation.error);
                setStatus("");
                return;
            }

            const operationId = operationRef.current + 1;
            operationRef.current = operationId;

            releaseSource();
            revokePreviewUrl();
            setError("");
            setStatus("");
            setConvertedBlob(null);
            setPreviewUrl("");
            setSourceImage(null);
            setDimensions(null);
            setStage(STAGES.READING);
            setProgress(0);

            try {
                const loaded = await loadImageFromFileWithProgress(nextFile, (pct) => {
                    if (operationRef.current !== operationId) return;
                    setProgress(mapProgress(STAGES.READING, pct));
                });

                if (operationRef.current !== operationId) {
                    URL.revokeObjectURL(loaded.objectUrl);
                    return;
                }

                sourceRef.current = loaded;
                setFile(nextFile);
                setSourceImage(loaded.image);
                setDimensions({ width: loaded.width, height: loaded.height });
            } catch (loadError) {
                if (operationRef.current !== operationId) return;
                setError(loadError.message || "Failed to load image.");
                setFile(null);
                setSourceImage(null);
                setDimensions(null);
                setStage(STAGES.IDLE);
                setProgress(0);
            }
        },
        [mode, releaseSource, revokePreviewUrl],
    );

    useEffect(() => {
        if (!sourceImage) return undefined;

        const operationId = operationRef.current;
        let cancelled = false;

        const run = async () => {
            setError("");
            setStage(STAGES.RENDERING);
            setProgress(mapProgress(STAGES.RENDERING));
            await waitFrame();

            if (cancelled || operationRef.current !== operationId) return;

            setStage(STAGES.ENCODING);
            setProgress(mapProgress(STAGES.ENCODING));

            try {
                const blob = await convertOnCanvas(sourceImage, {
                    mode,
                    lossless,
                    quality,
                    targetFormat,
                });

                if (cancelled || operationRef.current !== operationId) return;

                setConvertedBlob(blob);
                setPreviewFromBlob(blob);
                setStage(STAGES.DONE);
                setProgress(100);
            } catch (conversionError) {
                if (cancelled || operationRef.current !== operationId) return;
                setConvertedBlob(null);
                revokePreviewUrl();
                setPreviewUrl("");
                setError(conversionError.message || "Conversion failed.");
                setStage(STAGES.IDLE);
                setProgress(0);
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [sourceImage, mode, lossless, quality, targetFormat, revokePreviewUrl, setPreviewFromBlob]);

    useEffect(
        () => () => {
            operationRef.current += 1;
            releaseSource();
            revokePreviewUrl();
        },
        [releaseSource, revokePreviewUrl],
    );

    const handleDownload = () => {
        if (!convertedBlob || !file || isProcessing) return;
        const ext =
            mode === "to-webp" ? "webp" : targetFormat === "jpg" ? "jpg" : "png";
        triggerDownload(convertedBlob, replaceExtension(file.name, ext));
        setStatus("Download started.");
        setError("");
    };

    const handleCopy = async () => {
        if (!convertedBlob || isProcessing) return;
        try {
            await copyBlobToClipboard(convertedBlob);
            setStatus("Copied to clipboard.");
            setError("");
        } catch (copyError) {
            setStatus("");
            setError(copyError.message);
        }
    };

    const accept = mode === "from-webp" ? "image/webp,.webp" : IMAGE_ACCEPT;
    const hasImage = Boolean(sourceImage);
    const canExport = Boolean(convertedBlob) && stage === STAGES.DONE && !isProcessing;
    const savingsLabel =
        file && convertedBlob ? formatSavingsPercent(file.size, convertedBlob.size) : null;
    const encodingLabel =
        mode === "to-webp" ? STAGE_LABELS[STAGES.ENCODING] : "Encoding output...";

    const left = (
        <>
            <div>
                <span className="img-tool__label">Mode</span>
                <div className="img-tool__segmented" role="group" aria-label="Conversion mode">
                    <button
                        type="button"
                        className={`img-tool__segment cursor-target${mode === "to-webp" ? " is-active" : ""}`}
                        aria-pressed={mode === "to-webp"}
                        disabled={isProcessing}
                        onClick={() => {
                            if (mode !== "to-webp") resetTool();
                            setMode("to-webp");
                        }}
                    >
                        To WEBP
                    </button>
                    <button
                        type="button"
                        className={`img-tool__segment cursor-target${mode === "from-webp" ? " is-active" : ""}`}
                        aria-pressed={mode === "from-webp"}
                        disabled={isProcessing}
                        onClick={() => {
                            if (mode !== "from-webp") resetTool();
                            setMode("from-webp");
                        }}
                    >
                        From WEBP
                    </button>
                </div>
            </div>

            {mode === "to-webp" ? (
                <>
                    <div>
                        <span className="img-tool__label">Compression</span>
                        <div className="img-tool__segmented" role="group" aria-label="Compression type">
                            <button
                                type="button"
                                className={`img-tool__segment cursor-target${!lossless ? " is-active" : ""}`}
                                aria-pressed={!lossless}
                                disabled={isProcessing}
                                onClick={() => setLossless(false)}
                            >
                                Lossy
                            </button>
                            <button
                                type="button"
                                className={`img-tool__segment cursor-target${lossless ? " is-active" : ""}`}
                                aria-pressed={lossless}
                                disabled={isProcessing}
                                onClick={() => setLossless(true)}
                            >
                                Lossless
                            </button>
                        </div>
                    </div>
                    <ImageToolRange
                        id="webp-quality"
                        label="Quality"
                        min={1}
                        max={100}
                        value={quality}
                        disabled={lossless || isProcessing}
                        onChange={setQuality}
                        formatDisplay={(val) => (lossless ? "Lossless" : `${val}%`)}
                        lowLabel="Low"
                        highLabel="High"
                    />
                </>
            ) : (
                <div>
                    <label className="img-tool__label" htmlFor="webp-target">
                        Target format
                    </label>
                    <select
                        id="webp-target"
                        className="img-tool__select"
                        value={targetFormat}
                        disabled={isProcessing}
                        onChange={(e) => setTargetFormat(e.target.value)}
                    >
                        <option value="png">PNG</option>
                        <option value="jpg">JPG</option>
                    </select>
                </div>
            )}

            <div className="img-tool__actions">
                <button
                    type="button"
                    className="img-tool__btn img-tool__btn--primary cursor-target"
                    disabled={!canExport}
                    onClick={handleDownload}
                >
                    Convert &amp; Download
                </button>
                <button
                    type="button"
                    className="img-tool__btn cursor-target"
                    disabled={!canExport}
                    onClick={handleCopy}
                >
                    Copy Image to Clipboard
                </button>
                <button
                    type="button"
                    className="img-tool__btn cursor-target"
                    disabled={isProcessing && !hasImage}
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
                className={`img-tool__dropzone${isDragging ? " is-dragging" : ""}${isProcessing ? " is-disabled" : ""}`}
                onDragEnter={(e) => {
                    preventDragDefaults(e);
                    if (!isProcessing) setIsDragging(true);
                }}
                onDragOver={preventDragDefaults}
                onDragLeave={(e) => {
                    preventDragDefaults(e);
                    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
                }}
                onDrop={(e) => {
                    preventDragDefaults(e);
                    setIsDragging(false);
                    if (isProcessing) return;
                    const nextFile = e.dataTransfer.files?.[0];
                    if (nextFile) ingestFile(nextFile);
                }}
                onClick={() => {
                    if (!isProcessing) fileInputRef.current?.click();
                }}
                onKeyDown={(e) => {
                    if (isProcessing) return;
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileInputRef.current?.click();
                    }
                }}
                role="button"
                tabIndex={isProcessing ? -1 : 0}
                aria-disabled={isProcessing}
            >
                <input
                    ref={fileInputRef}
                    className="img-tool__dropzone-input"
                    type="file"
                    accept={accept}
                    disabled={isProcessing}
                    onChange={(e) => {
                        const nextFile = e.target.files?.[0];
                        if (nextFile) ingestFile(nextFile);
                    }}
                    aria-label="Upload image"
                />
                <p className="img-tool__dropzone-text">
                    {file ? (
                        <>
                            <span style={{ color: "#f8fafc", fontWeight: 600 }}>{file.name}</span>
                            <br />
                            Drop a new image or click to replace
                        </>
                    ) : mode === "from-webp" ? (
                        <>
                            Drag &amp; drop a WEBP image here
                            <br />
                            or click to browse — max 30 MB
                        </>
                    ) : (
                        <>
                            Drag &amp; drop an image here
                            <br />
                            or click to browse — PNG, JPG, WEBP, BMP, GIF (max 30 MB)
                        </>
                    )}
                </p>
                <span className="img-tool__btn cursor-target">Choose File</span>
            </div>

            {hasImage && dimensions && (
                <div className="img-tool__meta" aria-live="polite">
                    <span className="img-tool__chip">
                        <strong>{dimensions.width}</strong> × <strong>{dimensions.height}</strong> px
                    </span>
                    <span className="img-tool__chip">
                        Original: <strong>{formatBytes(file.size)}</strong>
                    </span>
                    <span className="img-tool__chip">
                        Converted:{" "}
                        <strong>
                            {convertedBlob ? formatBytes(convertedBlob.size) : isProcessing ? "…" : "—"}
                        </strong>
                    </span>
                    {savingsLabel && (
                        <span className="img-tool__chip img-tool__chip--accent">
                            <strong>{savingsLabel}</strong>
                        </span>
                    )}
                </div>
            )}

            <div className="img-tool__preview-frame">
                {previewUrl ? (
                    <img
                        className="img-tool__preview-image"
                        src={previewUrl}
                        alt="Converted preview"
                    />
                ) : (
                    <p className="img-tool__preview-empty">
                        {hasImage
                            ? isProcessing
                                ? STAGE_LABELS[stage] || "Processing…"
                                : "Preview will appear here"
                            : "Upload an image to preview the conversion"}
                    </p>
                )}
            </div>
        </>
    );

    const progressLabel =
        stage === STAGES.ENCODING
            ? encodingLabel
            : STAGE_LABELS[stage] || "";

    return (
        <ImageToolWorkspace
            title="WEBP Converter"
            error={error}
            status={status}
            left={left}
            right={right}
            showProgress={stage !== STAGES.IDLE}
            progressLabel={progressLabel}
            progress={progress}
        />
    );
}

export default WebpConverter;

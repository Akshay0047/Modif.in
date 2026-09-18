import { useCallback, useEffect, useRef, useState } from "react";
import BackButton from "../../../components/BackButton";
import ImageToolShell from "../_shared/ImageToolShell";
import usePreventWindowDragDrop from "../_shared/usePreventWindowDragDrop";
import { preventDragDefaults, copyBlobToClipboard } from "../_shared/imageToolUtils";
import {
    ACCEPTED_FILE_TYPES,
    buildDownloadName,
    convertImageOnCanvas,
    formatBytes,
    formatSavingsPercent,
    loadImageFromFileWithProgress,
    mapStageToProgress,
    PROCESS_STAGES,
    STAGE_LABELS,
    triggerDownload,
    validateImageFile,
} from "./convertUtils";
import "./convert-to-jpg-png.css";

function ConvertToJpgPng() {
    usePreventWindowDragDrop();

    const fileInputRef = useRef(null);
    const sourceRef = useRef(null);
    const previewUrlRef = useRef("");
    const operationRef = useRef(0);

    const [file, setFile] = useState(null);
    const [sourceImage, setSourceImage] = useState(null);
    const [targetFormat, setTargetFormat] = useState("jpg");
    const [quality, setQuality] = useState(90);
    const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
    const [convertedBlob, setConvertedBlob] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [dimensions, setDimensions] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [stage, setStage] = useState(PROCESS_STAGES.IDLE);
    const [readProgress, setReadProgress] = useState(0);
    const [progress, setProgress] = useState(0);
    const [validationError, setValidationError] = useState("");
    const [status, setStatus] = useState("");

    const isProcessing =
        stage === PROCESS_STAGES.READING ||
        stage === PROCESS_STAGES.RENDERING ||
        stage === PROCESS_STAGES.COMPRESSING;

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
        if (sourceRef.current?.objectUrl) {
            URL.revokeObjectURL(sourceRef.current.objectUrl);
        }
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
        setValidationError("");
        setStatus("");
        setStage(PROCESS_STAGES.IDLE);
        setReadProgress(0);
        setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [releaseSource, revokePreviewUrl]);

    const ingestFile = useCallback(
        async (nextFile) => {
            const validation = validateImageFile(nextFile);
            if (!validation.ok) {
                setValidationError(validation.error);
                setStatus("");
                return;
            }

            const operationId = operationRef.current + 1;
            operationRef.current = operationId;

            releaseSource();
            revokePreviewUrl();
            setValidationError("");
            setStatus("");
            setConvertedBlob(null);
            setPreviewUrl("");
            setSourceImage(null);
            setDimensions(null);
            setStage(PROCESS_STAGES.READING);
            setReadProgress(0);
            setProgress(0);

            try {
                const loaded = await loadImageFromFileWithProgress(nextFile, (percent) => {
                    if (operationRef.current !== operationId) return;
                    setReadProgress(percent);
                    setProgress(mapStageToProgress(PROCESS_STAGES.READING, percent));
                });

                if (operationRef.current !== operationId) {
                    URL.revokeObjectURL(loaded.objectUrl);
                    return;
                }

                sourceRef.current = loaded;
                setFile(nextFile);
                setSourceImage(loaded.image);
                setDimensions({
                    width: loaded.width,
                    height: loaded.height,
                });
            } catch (loadError) {
                if (operationRef.current !== operationId) return;
                setValidationError(loadError.message || "Failed to load image.");
                setFile(null);
                setSourceImage(null);
                setDimensions(null);
                setStage(PROCESS_STAGES.IDLE);
                setProgress(0);
            }
        },
        [releaseSource, revokePreviewUrl],
    );

    const handleFileChange = (event) => {
        const nextFile = event.target.files?.[0];
        if (nextFile) ingestFile(nextFile);
    };

    const handleDragEnter = (event) => {
        preventDragDefaults(event);
        if (!isProcessing) setIsDragging(true);
    };

    const handleDragOver = (event) => {
        preventDragDefaults(event);
    };

    const handleDragLeave = (event) => {
        preventDragDefaults(event);
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsDragging(false);
        }
    };

    const handleDrop = (event) => {
        preventDragDefaults(event);
        setIsDragging(false);
        if (isProcessing) return;
        const nextFile = event.dataTransfer.files?.[0];
        if (nextFile) ingestFile(nextFile);
    };

    useEffect(() => {
        if (!sourceImage) return undefined;

        const operationId = operationRef.current;
        let cancelled = false;

        const runConversion = async () => {
            setValidationError("");
            setStage(PROCESS_STAGES.RENDERING);
            setProgress(mapStageToProgress(PROCESS_STAGES.RENDERING));

            try {
                const blob = await convertImageOnCanvas(
                    sourceImage,
                    targetFormat,
                    quality,
                    backgroundColor,
                    {
                        onStage: (nextStage) => {
                            if (cancelled || operationRef.current !== operationId) return;
                            setStage(nextStage);
                            setProgress(mapStageToProgress(nextStage));
                        },
                    },
                );

                if (cancelled || operationRef.current !== operationId) return;

                setConvertedBlob(blob);
                setPreviewFromBlob(blob);
                setProgress(100);
                setStage(PROCESS_STAGES.READY);
            } catch (conversionError) {
                if (cancelled || operationRef.current !== operationId) return;
                setConvertedBlob(null);
                revokePreviewUrl();
                setPreviewUrl("");
                setValidationError(conversionError.message || "Conversion failed.");
                setStage(PROCESS_STAGES.IDLE);
                setProgress(0);
            }
        };

        runConversion();

        return () => {
            cancelled = true;
        };
    }, [
        sourceImage,
        targetFormat,
        quality,
        backgroundColor,
        revokePreviewUrl,
        setPreviewFromBlob,
    ]);

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
        triggerDownload(convertedBlob, buildDownloadName(file.name, targetFormat));
        setStatus("Download started.");
        setValidationError("");
    };

    const handleCopy = async () => {
        if (!convertedBlob || isProcessing) return;

        try {
            await copyBlobToClipboard(convertedBlob);
            setStatus("Copied to clipboard.");
            setValidationError("");
        } catch (copyError) {
            setStatus("");
            setValidationError(copyError.message || "Could not copy to clipboard.");
        }
    };

    const isJpg = targetFormat === "jpg";
    const hasImage = Boolean(sourceImage);
    const canExport =
        Boolean(convertedBlob) && stage === PROCESS_STAGES.READY && !isProcessing;
    const savingsLabel =
        file && convertedBlob ? formatSavingsPercent(file.size, convertedBlob.size) : null;
    const stageLabel = STAGE_LABELS[stage] || "";
    const showProgress = stage !== PROCESS_STAGES.IDLE;

    return (
        <ImageToolShell>
            <BackButton />

            <div className="cvt-jpg-png">
                <h1 className="cvt-jpg-png__title">Convert to JPG / PNG</h1>

                <p className="cvt-jpg-png__privacy" role="note">
                    🔒 100% Client-Side: Your images are processed directly in your
                    browser memory and never uploaded to any server.
                </p>

                {validationError && (
                    <div className="cvt-jpg-png__error-badge" role="alert">
                        {validationError}
                    </div>
                )}

                <div className="cvt-jpg-png__layout">
                    <section className="cvt-jpg-png__panel cvt-jpg-png__controls">
                        <div>
                            <span className="cvt-jpg-png__label">Target format</span>
                            <div className="cvt-jpg-png__segmented" role="group" aria-label="Target format">
                                <button
                                    type="button"
                                    className={`cvt-jpg-png__segment cursor-target${isJpg ? " is-active" : ""}`}
                                    aria-pressed={isJpg}
                                    disabled={isProcessing}
                                    onClick={() => setTargetFormat("jpg")}
                                >
                                    JPG
                                </button>
                                <button
                                    type="button"
                                    className={`cvt-jpg-png__segment cursor-target${!isJpg ? " is-active" : ""}`}
                                    aria-pressed={!isJpg}
                                    disabled={isProcessing}
                                    onClick={() => setTargetFormat("png")}
                                >
                                    PNG
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="cvt-jpg-png__label" htmlFor="cvt-quality">
                                Quality
                            </label>
                            <input
                                id="cvt-quality"
                                className="cvt-jpg-png__range"
                                type="range"
                                min={1}
                                max={100}
                                value={quality}
                                disabled={!isJpg || isProcessing}
                                onChange={(event) => setQuality(Number(event.target.value))}
                            />
                            <div className="cvt-jpg-png__range-meta">
                                <span>Low</span>
                                <span className="cvt-jpg-png__range-value">
                                    {isJpg ? `${quality}%` : "N/A for PNG"}
                                </span>
                                <span>High</span>
                            </div>
                        </div>

                        <div>
                            <span className="cvt-jpg-png__label">Transparency fill (JPG only)</span>
                            <div className="cvt-jpg-png__color-row">
                                <input
                                    className="cvt-jpg-png__color-input cursor-target"
                                    type="color"
                                    value={backgroundColor}
                                    disabled={!isJpg || isProcessing}
                                    onChange={(event) => setBackgroundColor(event.target.value)}
                                    aria-label="Background color for transparent areas"
                                />
                                <input
                                    className="cvt-jpg-png__color-text"
                                    type="text"
                                    value={backgroundColor}
                                    disabled={!isJpg || isProcessing}
                                    maxLength={7}
                                    spellCheck={false}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        if (/^#?[0-9a-fA-F]{0,6}$/.test(value)) {
                                            setBackgroundColor(
                                                value.startsWith("#") ? value : `#${value}`,
                                            );
                                        }
                                    }}
                                    aria-label="Background color hex value"
                                />
                            </div>
                        </div>

                        <div className="cvt-jpg-png__actions">
                            <button
                                type="button"
                                className="cvt-jpg-png__btn cvt-jpg-png__btn--primary cursor-target"
                                disabled={!canExport}
                                onClick={handleDownload}
                            >
                                Download
                            </button>
                            <button
                                type="button"
                                className="cvt-jpg-png__btn cursor-target"
                                disabled={!canExport}
                                onClick={handleCopy}
                            >
                                Copy to Clipboard
                            </button>
                            <button
                                type="button"
                                className="cvt-jpg-png__btn cursor-target"
                                disabled={isProcessing && !hasImage}
                                onClick={resetTool}
                            >
                                Clear
                            </button>
                        </div>
                    </section>

                    <section className="cvt-jpg-png__panel cvt-jpg-png__preview-col">
                        <div
                            className={`cvt-jpg-png__dropzone${isDragging ? " is-dragging" : ""}${isProcessing ? " is-disabled" : ""}`}
                            onDragEnter={handleDragEnter}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => {
                                if (!isProcessing) fileInputRef.current?.click();
                            }}
                            onKeyDown={(event) => {
                                if (isProcessing) return;
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    fileInputRef.current?.click();
                                }
                            }}
                            role="button"
                            tabIndex={isProcessing ? -1 : 0}
                            aria-disabled={isProcessing}
                        >
                            <input
                                ref={fileInputRef}
                                className="cvt-jpg-png__dropzone-input"
                                type="file"
                                accept={ACCEPTED_FILE_TYPES}
                                disabled={isProcessing}
                                onChange={handleFileChange}
                                aria-label="Upload image"
                            />
                            <p className="cvt-jpg-png__dropzone-text">
                                {file ? (
                                    <>
                                        <span className="cvt-jpg-png__dropzone-name">{file.name}</span>
                                        <br />
                                        Drop a new image or click to replace
                                    </>
                                ) : (
                                    <>
                                        Drag &amp; drop an image here
                                        <br />
                                        or click to browse — PNG, JPG, WEBP, BMP, GIF (max 30 MB)
                                    </>
                                )}
                            </p>
                            <span className="cvt-jpg-png__btn cursor-target">Choose File</span>
                        </div>

                        {showProgress && (
                            <div className="cvt-jpg-png__progress" aria-live="polite">
                                <div className="cvt-jpg-png__progress-header">
                                    <span className="cvt-jpg-png__progress-stage">{stageLabel}</span>
                                    <span className="cvt-jpg-png__progress-value">{progress}%</span>
                                </div>
                                <div
                                    className="cvt-jpg-png__progress-track"
                                    role="progressbar"
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={progress}
                                    aria-label={stageLabel}
                                >
                                    <div
                                        className="cvt-jpg-png__progress-fill"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {hasImage && dimensions && (
                            <div className="cvt-jpg-png__meta" aria-live="polite">
                                <span className="cvt-jpg-png__chip">
                                    <strong>{dimensions.width}</strong> ×{" "}
                                    <strong>{dimensions.height}</strong> px
                                </span>
                                <span className="cvt-jpg-png__chip">
                                    Original: <strong>{formatBytes(file.size)}</strong>
                                </span>
                                <span className="cvt-jpg-png__chip">
                                    Converted:{" "}
                                    <strong>
                                        {convertedBlob
                                            ? formatBytes(convertedBlob.size)
                                            : isProcessing
                                              ? "…"
                                              : "—"}
                                    </strong>
                                </span>
                                {savingsLabel && (
                                    <span className="cvt-jpg-png__chip cvt-jpg-png__chip--accent">
                                        <strong>{savingsLabel}</strong>
                                    </span>
                                )}
                                <span className="cvt-jpg-png__chip">
                                    Format: <strong>{targetFormat.toUpperCase()}</strong>
                                </span>
                            </div>
                        )}

                        <div className="cvt-jpg-png__preview-frame">
                            {previewUrl ? (
                                <img
                                    className="cvt-jpg-png__preview-image"
                                    src={previewUrl}
                                    alt={`Converted preview as ${targetFormat.toUpperCase()}`}
                                />
                            ) : (
                                <p className="cvt-jpg-png__preview-empty">
                                    {hasImage
                                        ? isProcessing
                                            ? stageLabel || "Processing…"
                                            : "Preview will appear here"
                                        : "Upload an image to preview the conversion"}
                                </p>
                            )}
                        </div>

                        {status && (
                            <p className="cvt-jpg-png__status is-success" aria-live="polite">
                                {status}
                            </p>
                        )}
                    </section>
                </div>
            </div>
        </ImageToolShell>
    );
}

export default ConvertToJpgPng;

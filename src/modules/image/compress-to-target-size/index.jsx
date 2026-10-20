import { handleFilePickerKeyDown } from "../_shared/imageToolUtils";
import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import {COMPRESS_ACCEPT,
    binarySearchTargetSize,
    formatBytes,
    loadImageFromFileWithProgress,
    parseTargetBytes,
    replaceExtension,
    triggerDownload,
    validateCompressImage,
    waitFrame, preventDragDefaults } from "../_shared/imageToolUtils";
// preventDragDefaults imported below

function CompressToTargetSize() {
    const fileInputRef = useRef(null);
    const sourceRef = useRef(null);
    const previewUrlRef = useRef("");
    const operationRef = useRef(0);

    const [file, setFile] = useState(null);
    const [sourceImage, setSourceImage] = useState(null);
    const [targetValue, setTargetValue] = useState("200");
    const [targetUnit, setTargetUnit] = useState("KB");
    const [format, setFormat] = useState("auto");
    const [allowScale, setAllowScale] = useState(true);
    const [result, setResult] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState("");
    const [showProgress, setShowProgress] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const releaseSource = useCallback(() => {
        if (sourceRef.current?.objectUrl) URL.revokeObjectURL(sourceRef.current.objectUrl);
        sourceRef.current = null;
    }, []);

    const revokePreview = useCallback(() => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = "";
        }
    }, []);

    const resetTool = useCallback(() => {
        operationRef.current += 1;
        releaseSource();
        revokePreview();
        setFile(null);
        setSourceImage(null);
        setResult(null);
        setPreviewUrl("");
        setError("");
        setStatus("");
        setShowProgress(false);
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [releaseSource, revokePreview]);

    const ingestFile = useCallback(
        async (nextFile) => {
            const validation = validateCompressImage(nextFile);
            if (!validation.ok) {
                setError(validation.error);
                return;
            }
            const op = operationRef.current + 1;
            operationRef.current = op;
            releaseSource();
            revokePreview();
            setResult(null);
            setPreviewUrl("");
            setError("");
            setStatus("");
            setShowProgress(true);
            setProgressLabel("Reading file...");
            setProgress(10);

            try {
                const loaded = await loadImageFromFileWithProgress(nextFile, (pct) => {
                    if (operationRef.current !== op) return;
                    setProgress(Math.round(pct * 0.2));
                });
                if (operationRef.current !== op) {
                    URL.revokeObjectURL(loaded.objectUrl);
                    return;
                }
                sourceRef.current = loaded;
                setFile(nextFile);
                setSourceImage(loaded.image);
                setShowProgress(false);
            } catch (err) {
                if (operationRef.current !== op) return;
                setError(err.message);
                setShowProgress(false);
            }
        },
        [releaseSource, revokePreview],
    );

    const runCompress = async () => {
        if (!sourceImage || !file || isProcessing) return;

        const targetBytes = parseTargetBytes(targetValue, targetUnit);
        if (!targetBytes) {
            setError("Enter a valid target size.");
            return;
        }
        if (targetBytes >= file.size) {
            setError("Target size must be smaller than the original file.");
            return;
        }

        setError("");
        setStatus("");
        setIsProcessing(true);
        setShowProgress(true);
        setProgressLabel("Binary search compression...");
        setProgress(30);

        try {
            await waitFrame();
            const compressed = await binarySearchTargetSize(sourceImage, file, targetBytes, {
                format,
                allowScaleDown: allowScale,
                maxQualityIterations: 8,
                maxScalePasses: 4,
                onProgress: ({ qualityIterations, scalePass }) => {
                    setProgressLabel(
                        scalePass > 0
                            ? `Testing pass ${qualityIterations}/8 (scale pass ${scalePass}/4)...`
                            : `Testing pass ${qualityIterations}/8...`,
                    );
                    setProgress(Math.min(90, 30 + qualityIterations * 7));
                },
            });
            setProgress(90);
            revokePreview();
            const url = URL.createObjectURL(compressed.blob);
            previewUrlRef.current = url;
            setPreviewUrl(url);
            setResult(compressed);
            setProgress(100);
            setProgressLabel("Done");
            setShowProgress(false);
            setStatus(
                compressed.blob.size <= targetBytes
                    ? "Target achieved."
                    : "Closest match found (could not reach exact target).",
            );
        } catch (err) {
            setError(err.message || "Compression failed.");
            setShowProgress(false);
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(
        () => () => {
            operationRef.current += 1;
            releaseSource();
            revokePreview();
        },
        [releaseSource, revokePreview],
    );

    const handleDownload = () => {
        if (!result?.blob || !file) return;
        triggerDownload(result.blob, replaceExtension(file.name, result.ext));
        setStatus("Download started.");
    };

    const targetBytes = parseTargetBytes(targetValue, targetUnit);
    const hasImage = Boolean(sourceImage);

    const left = (
        <>
            <div className="img-tool__field-row">
                <div>
                    <label className="img-tool__label" htmlFor="tgt-size">Target size</label>
                    <input
                        id="tgt-size"
                        className="img-tool__input"
                        type="number"
                        min={1}
                        value={targetValue}
                        disabled={!hasImage || isProcessing}
                        onChange={(e) => setTargetValue(e.target.value)}
                    />
                </div>
                <div>
                    <label className="img-tool__label" htmlFor="tgt-unit">Unit</label>
                    <select
                        id="tgt-unit"
                        className="img-tool__select"
                        value={targetUnit}
                        disabled={!hasImage || isProcessing}
                        onChange={(e) => setTargetUnit(e.target.value)}
                    >
                        <option value="KB">KB</option>
                        <option value="MB">MB</option>
                    </select>
                </div>
            </div>

            <div>
                <span className="img-tool__label">Output format</span>
                <div className="img-tool__segmented" role="group">
                    {["auto", "webp", "jpg"].map((f) => (
                        <button aria-pressed={format === f}
                            key={f}
                            type="button"
                            className={`img-tool__segment${format === f ? " is-active" : ""}`}
                            disabled={!hasImage || isProcessing}
                            onClick={() => setFormat(f)}
                        >
                            {f === "auto" ? "Auto" : f.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <label className="img-tool__checkbox-row">
                <input
                    type="checkbox"
                    checked={allowScale}
                    disabled={!hasImage || isProcessing}
                    onChange={(e) => setAllowScale(e.target.checked)}
                />
                Scale down 15% per pass if quality alone is insufficient
            </label>

            <div className="img-tool__actions">
                <button
                    type="button"
                    className="img-tool__btn img-tool__btn--primary"
                    disabled={!hasImage || isProcessing}
                    onClick={runCompress}
                >
                    Calculate &amp; Compress
                </button>
                <button
                    type="button"
                    className="img-tool__btn"
                    disabled={!result?.blob || isProcessing}
                    onClick={handleDownload}
                >
                    Download
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
                onKeyDown={handleFilePickerKeyDown}
                role="button"
                tabIndex={0}
            >
                <input
                    ref={fileInputRef}
                    className="img-tool__dropzone-input"
                    type="file"
                    accept={COMPRESS_ACCEPT}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) ingestFile(f); }}
                />
                <p className="img-tool__dropzone-text">
                    {file ? `${file.name} (${formatBytes(file.size)})` : "Drop JPG, PNG, or WEBP (max 30 MB)"}
                </p>
            </div>

            {hasImage && (
                <div className="img-tool__meta">
                    <span className="img-tool__chip">
                        Target: <strong>{targetBytes ? formatBytes(targetBytes) : "—"}</strong>
                    </span>
                    <span className="img-tool__chip">
                        Achieved: <strong>{result ? formatBytes(result.blob.size) : "—"}</strong>
                    </span>
                    {result && (
                        <span className="img-tool__chip img-tool__chip--accent">
                            Quality <strong>{result.quality}%</strong>
                            {result.scale < 1 ? ` · Scale ${Math.round(result.scale * 100)}%` : ""}
                        </span>
                    )}
                </div>
            )}

            <div className="img-tool__preview-frame">
                {previewUrl ? (
                    <img className="img-tool__preview-image" src={previewUrl} alt="Compressed preview" />
                ) : (
                    <p className="img-tool__preview-empty">
                        {hasImage ? "Run compression to preview result" : "Upload an image to begin"}
                    </p>
                )}
            </div>
        </>
    );

    return (
        <ImageToolWorkspace
            inputInPreview
            title="Compress to Target Size"
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

export default CompressToTargetSize;

import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import ImageToolRange from "../_shared/ImageToolRange";
import useDebouncedValue from "../_shared/useDebouncedValue";
import {COMPRESS_ACCEPT,
    compressImage,
    copyBlobToClipboard,
    formatBytes,
    formatSavingsPercent,
    loadImageFromFileWithProgress,
    megapixelWarning,
    replaceExtension,
    triggerDownload,
    validateCompressImage,
    waitFrame, preventDragDefaults } from "../_shared/imageToolUtils";
// preventDragDefaults imported below

function CompressImage() {
    const fileInputRef = useRef(null);
    const sourceRef = useRef(null);
    const originalUrlRef = useRef("");
    const compressedUrlRef = useRef("");
    const operationRef = useRef(0);

    const [file, setFile] = useState(null);
    const [sourceImage, setSourceImage] = useState(null);
    const [dimensions, setDimensions] = useState(null);
    const [quality, setQuality] = useState(80);
    const debouncedQuality = useDebouncedValue(quality, 250);
    const [useWebp, setUseWebp] = useState(false);
    const [capWidth, setCapWidth] = useState(false);
    const [split, setSplit] = useState(50);
    const [originalUrl, setOriginalUrl] = useState("");
    const [compressedUrl, setCompressedUrl] = useState("");
    const [compressedBlob, setCompressedBlob] = useState(null);
    const [outputExt, setOutputExt] = useState("jpg");
    const [elapsedMs, setElapsedMs] = useState(null);
    const [warning, setWarning] = useState("");
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState("");
    const [showProgress, setShowProgress] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const revokeUrls = useCallback(() => {
        if (originalUrlRef.current) {
            URL.revokeObjectURL(originalUrlRef.current);
            originalUrlRef.current = "";
        }
        if (compressedUrlRef.current) {
            URL.revokeObjectURL(compressedUrlRef.current);
            compressedUrlRef.current = "";
        }
    }, []);

    const releaseSource = useCallback(() => {
        if (sourceRef.current?.objectUrl) URL.revokeObjectURL(sourceRef.current.objectUrl);
        sourceRef.current = null;
    }, []);

    const resetTool = useCallback(() => {
        operationRef.current += 1;
        releaseSource();
        revokeUrls();
        setFile(null);
        setSourceImage(null);
        setDimensions(null);
        setOriginalUrl("");
        setCompressedUrl("");
        setCompressedBlob(null);
        setElapsedMs(null);
        setWarning("");
        setError("");
        setStatus("");
        setProgress(0);
        setShowProgress(false);
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [releaseSource, revokeUrls]);

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
            revokeUrls();
            setError("");
            setStatus("");
            setCompressedBlob(null);
            setCompressedUrl("");
            setOriginalUrl("");
            setElapsedMs(null);
            setShowProgress(true);
            setIsProcessing(true);
            setProgressLabel("Reading file...");
            setProgress(0);

            try {
                const loaded = await loadImageFromFileWithProgress(nextFile, (pct) => {
                    if (operationRef.current !== op) return;
                    setProgress(Math.round(pct * 0.3));
                });
                if (operationRef.current !== op) {
                    URL.revokeObjectURL(loaded.objectUrl);
                    return;
                }

                sourceRef.current = loaded;
                const origUrl = loaded.objectUrl;
                originalUrlRef.current = origUrl;
                setOriginalUrl(origUrl);
                setFile(nextFile);
                setSourceImage(loaded.image);
                setDimensions({ width: loaded.width, height: loaded.height });
                setWarning(megapixelWarning(loaded.width, loaded.height) || "");
            } catch (err) {
                if (operationRef.current !== op) return;
                setError(err.message || "Failed to load image.");
                setShowProgress(false);
                setIsProcessing(false);
            }
        },
        [releaseSource, revokeUrls],
    );

    useEffect(() => {
        if (!sourceImage || !file) return undefined;

        const op = operationRef.current;
        let cancelled = false;

        const run = async () => {
            setIsProcessing(true);
            setShowProgress(true);
            setProgressLabel("Compressing...");
            setProgress(40);
            const start = performance.now();

            try {
                await waitFrame();
                const result = await compressImage(sourceImage, file, {
                    quality: debouncedQuality,
                    useWebp,
                    maxWidth: capWidth ? 1920 : null,
                });
                if (cancelled || operationRef.current !== op) return;

                if (compressedUrlRef.current) URL.revokeObjectURL(compressedUrlRef.current);
                const nextUrl = URL.createObjectURL(result.blob);
                compressedUrlRef.current = nextUrl;
                setCompressedUrl(nextUrl);
                setCompressedBlob(result.blob);
                setOutputExt(result.ext);
                setElapsedMs(Math.round(performance.now() - start));
                setProgress(100);
                setProgressLabel("Ready");
                setShowProgress(false);
                setIsProcessing(false);
            } catch (err) {
                if (cancelled || operationRef.current !== op) return;
                setError(err.message || "Compression failed.");
                setShowProgress(false);
                setIsProcessing(false);
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [sourceImage, file, debouncedQuality, useWebp, capWidth]);

    useEffect(
        () => () => {
            operationRef.current += 1;
            releaseSource();
            revokeUrls();
        },
        [releaseSource, revokeUrls],
    );

    const handleDownload = () => {
        if (!compressedBlob || !file) return;
        triggerDownload(compressedBlob, replaceExtension(file.name, outputExt));
        setStatus("Download started.");
    };

    const handleCopy = async () => {
        if (!compressedBlob) return;
        try {
            await copyBlobToClipboard(compressedBlob);
            setStatus("Copied to clipboard.");
            setError("");
        } catch (err) {
            setError(err.message);
        }
    };

    const savings = file && compressedBlob ? formatSavingsPercent(file.size, compressedBlob.size) : null;
    const hasImage = Boolean(sourceImage);

    const left = (
        <>
            <ImageToolRange
                id="cmp-quality"
                label="Quality"
                min={1}
                max={100}
                value={quality}
                disabled={!hasImage}
                onChange={setQuality}
                unit="%"
                lowLabel="Low"
                highLabel="High"
            />

            <label className="img-tool__checkbox-row">
                <input
                    type="checkbox"
                    checked={useWebp}
                    disabled={!hasImage || isProcessing}
                    onChange={(e) => setUseWebp(e.target.checked)}
                />
                Convert to WEBP
            </label>

            <label className="img-tool__checkbox-row">
                <input
                    type="checkbox"
                    checked={capWidth}
                    disabled={!hasImage || isProcessing}
                    onChange={(e) => setCapWidth(e.target.checked)}
                />
                Cap width at 1920px
            </label>

            <div className="img-tool__actions">
                <button
                    type="button"
                    className="img-tool__btn img-tool__btn--primary"
                    disabled={!compressedBlob || isProcessing}
                    onClick={handleDownload}
                >
                    Download
                </button>
                <button
                    type="button"
                    className="img-tool__btn"
                    disabled={!compressedBlob || isProcessing}
                    onClick={handleCopy}
                >
                    Copy
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
                className={`img-tool__dropzone${isDragging ? " is-dragging" : ""}${isProcessing && !hasImage ? " is-disabled" : ""}`}
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
                    accept={COMPRESS_ACCEPT}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) ingestFile(f); }}
                />
                <p className="img-tool__dropzone-text">
                    {file ? `${file.name} — click or drop to replace` : "Drop JPG, PNG, or WEBP (max 30 MB)"}
                </p>
            </div>

            {warning ? <p className="img-tool__warning" role="status">{warning}</p> : null}

            {hasImage && dimensions && (
                <div className="img-tool__meta">
                    <span className="img-tool__chip">Original: <strong>{formatBytes(file.size)}</strong></span>
                    <span className="img-tool__chip">
                        New: <strong>{compressedBlob ? formatBytes(compressedBlob.size) : "…"}</strong>
                    </span>
                    {savings && <span className="img-tool__chip img-tool__chip--accent"><strong>{savings}</strong></span>}
                    {elapsedMs != null && <span className="img-tool__chip"><strong>{elapsedMs}</strong> ms</span>}
                    <span className="img-tool__chip">
                        <strong>{dimensions.width}</strong>×<strong>{dimensions.height}</strong>
                    </span>
                </div>
            )}

            <div className="img-tool__preview-frame">
                {originalUrl && compressedUrl ? (
                    <div className="img-tool__split" style={{ "--split": `${split}%` }}>
                        <div className="img-tool__split-labels">
                            <span className="img-tool__split-label">Before</span>
                            <span className="img-tool__split-label">After</span>
                        </div>
                        <div className="img-tool__split-layer img-tool__split-layer--before">
                            <img src={originalUrl} alt="Original" draggable={false} />
                        </div>
                        <div className="img-tool__split-layer img-tool__split-layer--after">
                            <img src={compressedUrl} alt="Compressed" draggable={false} />
                        </div>
                        <div className="img-tool__split-divider" />
                        <input
                            className="img-tool__split-handle"
                            type="range"
                            min={5}
                            max={95}
                            value={split}
                            aria-label="Before and after comparison"
                            onChange={(e) => setSplit(Number(e.target.value))}
                        />
                    </div>
                ) : (
                    <p className="img-tool__preview-empty">
                        {hasImage ? "Compressing preview…" : "Upload an image to compare before and after"}
                    </p>
                )}
            </div>
        </>
    );

    return (
        <ImageToolWorkspace
            title="Compress Image"
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

export default CompressImage;

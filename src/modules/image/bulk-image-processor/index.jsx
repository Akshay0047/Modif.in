import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import ImageToolRange from "../_shared/ImageToolRange";
import {IMAGE_ACCEPT,
    MB,
    applyNamingPattern,
    compressImage,
    downloadZip,
    formatBytes,
    loadImageFromBuffer,
    readFileWithProgress,
    validateStandardImage,
    waitFrame, preventDragDefaults } from "../_shared/imageToolUtils";
// preventDragDefaults imported below

const MAX_FILES = 25;
const MAX_TOTAL_BYTES = 100 * MB;
const CHUNK_SIZE = 2;

function BulkImageProcessor() {
    const fileInputRef = useRef(null);
    const operationRef = useRef(0);
    const queueRef = useRef([]);

    const [items, setItems] = useState([]);
    const [outputFormat, setOutputFormat] = useState("original");
    const [resizeMode, setResizeMode] = useState("none");
    const [scalePercent, setScalePercent] = useState(80);
    const [quality, setQuality] = useState(80);
    const [namingPattern, setNamingPattern] = useState("{name}-min.{ext}");
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState("");
    const [showProgress, setShowProgress] = useState(false);
    const [results, setResults] = useState([]);

    const revokeThumbs = useCallback((list) => {
        list.forEach((item) => {
            if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
        });
    }, []);

    const clearAll = useCallback(() => {
        operationRef.current += 1;
        revokeThumbs(items);
        setItems([]);
        setResults([]);
        setError("");
        setStatus("");
        setShowProgress(false);
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [items, revokeThumbs]);

    const addFiles = useCallback(
        (fileList) => {
            const incoming = Array.from(fileList || []);
            if (!incoming.length) return;

            const currentTotal = items.reduce((sum, i) => sum + i.file.size, 0);
            const next = [...items];
            let total = currentTotal;
            const errors = [];

            for (const file of incoming) {
                if (next.length >= MAX_FILES) {
                    errors.push(`Maximum ${MAX_FILES} files allowed.`);
                    break;
                }
                const validation = validateStandardImage(file);
                if (!validation.ok) {
                    errors.push(`${file.name}: ${validation.error}`);
                    continue;
                }
                if (total + file.size > MAX_TOTAL_BYTES) {
                    errors.push("Total batch size would exceed 100 MB.");
                    break;
                }
                total += file.size;
                const thumbUrl = URL.createObjectURL(file);
                next.push({
                    id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
                    file,
                    thumbUrl,
                    status: "pending",
                    error: "",
                    outputName: "",
                    outputSize: null,
                });
            }

            revokeThumbs(items);
            setItems(next);
            setResults([]);
            setError(errors.join(" "));
            setStatus(next.length ? `${next.length} file(s) queued.` : "");
        },
        [items, revokeThumbs],
    );

    const processBatch = async () => {
        if (!items.length || isProcessing) return;
        const op = operationRef.current + 1;
        operationRef.current = op;
        setIsProcessing(true);
        setShowProgress(true);
        setError("");
        setStatus("");
        setResults([]);
        const output = [];

        const working = items.map((i) => ({ ...i, status: "pending", error: "" }));
        setItems(working);
        queueRef.current = working;

        for (let start = 0; start < working.length; start += CHUNK_SIZE) {
            if (operationRef.current !== op) break;
            const chunk = working.slice(start, start + CHUNK_SIZE);

            for (const item of chunk) {
                if (operationRef.current !== op) break;
                item.status = "processing";
                setItems([...working]);
                setProgressLabel(`Processing ${item.file.name}...`);

                let loaded;
                try {
                    const buffer = await readFileWithProgress(item.file);
                    if (operationRef.current !== op) return;
                    loaded = await loadImageFromBuffer(buffer, item.file.type);
                    if (operationRef.current !== op) return;
                    const format = outputFormat === "original" ? "auto" : outputFormat;
                    const options = {
                        quality,
                        format,
                        useWebp: outputFormat === "webp",
                    };
                    if (resizeMode === "fit") options.maxWidth = 1920;
                    if (resizeMode === "scale") options.scalePercent = scalePercent;

                    const result = await compressImage(loaded.image, item.file, options);
                    if (operationRef.current !== op) return;

                    const name = applyNamingPattern(item.file.name, namingPattern, result.ext);
                    item.status = "done";
                    item.outputName = name;
                    item.outputSize = result.blob.size;
                    output.push({ name, blob: result.blob });
                } catch (err) {
                    if (operationRef.current !== op) return;
                    item.status = "error";
                    item.error = err.message || "Failed";
                } finally {
                    if (loaded?.objectUrl) URL.revokeObjectURL(loaded.objectUrl);
                }

                const done = working.filter((i) => i.status === "done" || i.status === "error").length;
                setProgress(Math.round((done / working.length) * 100));
                setItems([...working]);
                await waitFrame();
            }
        }

        if (operationRef.current === op) {
            setResults(output);
            setShowProgress(false);
            setIsProcessing(false);
            const failed = working.filter((i) => i.status === "error").length;
            setStatus(
                failed
                    ? `Completed with ${failed} error(s). ${output.length} file(s) ready.`
                    : `${output.length} file(s) processed successfully.`,
            );
        }
    };

    const handleDownloadZip = async () => {
        if (!results.length) return;
        setShowProgress(true);
        setProgressLabel("Building ZIP...");
        setProgress(50);
        try {
            await downloadZip(results, "processed-images.zip");
            setStatus("ZIP download started.");
            setProgress(100);
        } catch (err) {
            setError(err.message || "ZIP creation failed.");
        } finally {
            setShowProgress(false);
        }
    };

    useEffect(
        () => () => {
            operationRef.current += 1;
            revokeThumbs(items);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const totalSize = items.reduce((s, i) => s + i.file.size, 0);

    const left = (
        <>
            <div>
                <span className="img-tool__label">Output format</span>
                <div className="img-tool__segmented" role="group">
                    {["original", "jpg", "png", "webp"].map((f) => (
                        <button
                            key={f}
                            type="button"
                            className={`img-tool__segment${outputFormat === f ? " is-active" : ""}`}
                            disabled={isProcessing}
                            onClick={() => setOutputFormat(f)}
                        >
                            {f === "original" ? "Original" : f.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <span className="img-tool__label">Resize</span>
                <div className="img-tool__segmented" role="group">
                    {[
                        ["none", "None"],
                        ["fit", "Fit 1920"],
                        ["scale", "Scale %"],
                    ].map(([val, label]) => (
                        <button
                            key={val}
                            type="button"
                            className={`img-tool__segment${resizeMode === val ? " is-active" : ""}`}
                            disabled={isProcessing}
                            onClick={() => setResizeMode(val)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {resizeMode === "scale" && (
                <ImageToolRange
                    id="bulk-scale"
                    label="Scale percent"
                    min={10}
                    max={100}
                    value={scalePercent}
                    disabled={isProcessing}
                    onChange={setScalePercent}
                    unit="%"
                    lowLabel="10%"
                    highLabel="100%"
                />
            )}

            <ImageToolRange
                id="bulk-quality"
                label="Quality"
                min={1}
                max={100}
                value={quality}
                disabled={isProcessing}
                onChange={setQuality}
                unit="%"
                lowLabel="Low"
                highLabel="High"
            />

            <div>
                <label className="img-tool__label" htmlFor="bulk-pattern">Naming pattern</label>
                <input
                    id="bulk-pattern"
                    className="img-tool__input"
                    type="text"
                    value={namingPattern}
                    disabled={isProcessing}
                    onChange={(e) => setNamingPattern(e.target.value)}
                />
                <p className="img-tool__hint">Use {"{name}"} and {"{ext}"} placeholders.</p>
            </div>

            <div className="img-tool__actions">
                <button
                    type="button"
                    className="img-tool__btn img-tool__btn--primary"
                    disabled={!items.length || isProcessing}
                    onClick={processBatch}
                >
                    Start Batch
                </button>
                <button
                    type="button"
                    className="img-tool__btn"
                    disabled={!results.length || isProcessing}
                    onClick={handleDownloadZip}
                >
                    Download All ZIP
                </button>
                <button type="button" className="img-tool__btn" onClick={clearAll}>
                    Clear
                </button>
            </div>
        </>
    );

    const right = (
        <>
            <div
                className={`img-tool__dropzone${isDragging ? " is-dragging" : ""}${isProcessing ? " is-disabled" : ""}`}
                onDragEnter={(e) => {
                    preventDragDefaults(e); setIsDragging(true); }}
                onDragOver={preventDragDefaults}
                onDragLeave={(e) => {
                    preventDragDefaults(e); if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false); }}
                onDrop={(e) => {
                    preventDragDefaults(e);
                    setIsDragging(false);
                    if (isProcessing) return;
                    addFiles(e.dataTransfer.files);
                }}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
            >
                <input
                    ref={fileInputRef}
                    className="img-tool__dropzone-input"
                    type="file"
                    accept={IMAGE_ACCEPT}
                    multiple
                    disabled={isProcessing}
                    onChange={(e) => addFiles(e.target.files)}
                />
                <p className="img-tool__dropzone-text">
                    Drop up to {MAX_FILES} images (max {formatBytes(MAX_TOTAL_BYTES)} total)
                </p>
            </div>

            {items.length > 0 && (
                <div className="img-tool__meta">
                    <span className="img-tool__chip"><strong>{items.length}</strong> files</span>
                    <span className="img-tool__chip">Total: <strong>{formatBytes(totalSize)}</strong></span>
                </div>
            )}

            {items.length > 0 && (
                <div className="img-tool__list">
                    {items.map((item) => (
                        <div key={item.id} className="img-tool__list-item">
                            <img className="img-tool__list-thumb" src={item.thumbUrl} alt="" />
                            <div className="img-tool__list-info">
                                <span className="img-tool__list-name">{item.file.name}</span>
                                <span className="img-tool__list-meta">
                                    {formatBytes(item.file.size)}
                                    {item.outputSize ? ` → ${formatBytes(item.outputSize)}` : ""}
                                    {item.error ? ` · ${item.error}` : ""}
                                </span>
                            </div>
                            <span className={`img-tool__pill img-tool__pill--${item.status}`}>
                                {item.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    return (
        <ImageToolWorkspace
            title="Bulk Image Processor"
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

export default BulkImageProcessor;

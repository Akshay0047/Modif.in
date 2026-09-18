import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import {MB,
    formatBytes,
    readFileWithProgress,
    replaceExtension,
    triggerDownload,
    validateFile, preventDragDefaults } from "../_shared/imageToolUtils";
// preventDragDefaults imported below

const MAX_FILES = 10;
const MAX_BYTES = 40 * MB;
const HEIC_ACCEPT = ".heic,.heif,image/heic,image/heif";

const STAGES = {
    UNPACKING: "unpacking",
    DECODING: "decoding",
    ENCODING: "encoding",
    DONE: "done",
    ERROR: "error",
};

const STAGE_LABELS = {
    [STAGES.UNPACKING]: "Unpacking HEIC...",
    [STAGES.DECODING]: "Decoding...",
    [STAGES.ENCODING]: "Encoding output...",
    [STAGES.DONE]: "Done",
};

function validateHeicFile(file) {
    return validateFile(file, {
        maxBytes: MAX_BYTES,
        extensions: [/\.heic$/i, /\.heif$/i],
        mimes: new Set(["image/heic", "image/heif", ""]),
        sizeMessage: `File exceeds ${formatBytes(MAX_BYTES)} limit.`,
        typeMessage: "Unsupported file type. Please upload HEIC or HEIF files only.",
    });
}

function HeicToJpg() {
    const fileInputRef = useRef(null);
    const operationRef = useRef(0);
    const thumbUrlsRef = useRef([]);

    const [files, setFiles] = useState([]);
    const [targetFormat, setTargetFormat] = useState("jpg");
    const [quality, setQuality] = useState(90);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [globalProgress, setGlobalProgress] = useState(0);
    const [globalStage, setGlobalStage] = useState("");
    const [showProgress, setShowProgress] = useState(false);
    const [isZipping, setIsZipping] = useState(false);

    const isProcessing = files.some((f) =>
        [STAGES.UNPACKING, STAGES.DECODING, STAGES.ENCODING].includes(f.stage),
    );

    const revokeThumbUrls = useCallback(() => {
        thumbUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        thumbUrlsRef.current = [];
    }, []);

    const resetAll = useCallback(() => {
        operationRef.current += 1;
        revokeThumbUrls();
        setFiles([]);
        setError("");
        setStatus("");
        setGlobalProgress(0);
        setGlobalStage("");
        setShowProgress(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [revokeThumbUrls]);

    const convertFile = useCallback(
        async (entry, operationId) => {
            const updateEntry = (patch) => {
                if (operationRef.current !== operationId) return;
                setFiles((prev) =>
                    prev.map((f) => (f.id === entry.id ? { ...f, ...patch } : f)),
                );
            };

            updateEntry({ stage: STAGES.UNPACKING, progress: 10, error: "" });

            try {
                const heic2any = (await import("heic2any")).default;

                updateEntry({ stage: STAGES.DECODING, progress: 35 });
                await readFileWithProgress(entry.file, (pct) => {
                    updateEntry({ progress: 10 + Math.round(pct * 0.25) });
                });

                if (operationRef.current !== operationId) return;

                updateEntry({ stage: STAGES.ENCODING, progress: 60 });

                const toType = targetFormat === "jpg" ? "image/jpeg" : "image/png";
                const result = await heic2any({
                    blob: entry.file,
                    toType,
                    quality: quality / 100,
                });

                if (operationRef.current !== operationId) return;

                const blob = Array.isArray(result) ? result[0] : result;
                const thumbUrl = URL.createObjectURL(blob);
                thumbUrlsRef.current.push(thumbUrl);

                updateEntry({
                    stage: STAGES.DONE,
                    progress: 100,
                    blob,
                    thumbUrl,
                    outputSize: blob.size,
                });
            } catch (conversionError) {
                if (operationRef.current !== operationId) return;
                updateEntry({
                    stage: STAGES.ERROR,
                    progress: 0,
                    error: conversionError.message || "Conversion failed.",
                });
            }
        },
        [quality, targetFormat],
    );

    const processQueue = useCallback(
        async (newEntries) => {
            const operationId = operationRef.current;
            setShowProgress(true);
            setGlobalStage(STAGE_LABELS[STAGES.UNPACKING]);
            setGlobalProgress(5);

            for (let i = 0; i < newEntries.length; i += 1) {
                if (operationRef.current !== operationId) return;
                setGlobalStage(
                    `${STAGE_LABELS[STAGES.DECODING]} (${i + 1} of ${newEntries.length})`,
                );
                setGlobalProgress(Math.round(((i + 0.5) / newEntries.length) * 90));
                await convertFile(newEntries[i], operationId);
            }

            if (operationRef.current !== operationId) return;
            setGlobalStage(STAGE_LABELS[STAGES.DONE]);
            setGlobalProgress(100);
            setStatus(`${newEntries.length} file(s) processed.`);
        },
        [convertFile],
    );

    const addFiles = useCallback(
        (incoming) => {
            const list = Array.from(incoming);
            if (!list.length) return;

            const remaining = MAX_FILES - files.length;
            if (remaining <= 0) {
                setError(`Maximum ${MAX_FILES} files allowed.`);
                return;
            }

            const accepted = [];
            for (const file of list.slice(0, remaining)) {
                const validation = validateHeicFile(file);
                if (!validation.ok) {
                    setError(validation.error);
                    continue;
                }
                accepted.push({
                    id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
                    file,
                    stage: STAGES.UNPACKING,
                    progress: 0,
                    blob: null,
                    thumbUrl: "",
                    outputSize: 0,
                    error: "",
                });
            }

            if (!accepted.length) return;

            setError("");
            setFiles((prev) => [...prev, ...accepted]);
            processQueue(accepted);
        },
        [files.length, processQueue],
    );

    useEffect(
        () => () => {
            operationRef.current += 1;
            revokeThumbUrls();
        },
        [revokeThumbUrls],
    );

    const handleDownloadSingle = (entry) => {
        if (!entry.blob || isProcessing) return;
        const ext = targetFormat === "jpg" ? "jpg" : "png";
        triggerDownload(entry.blob, replaceExtension(entry.file.name, ext));
        setStatus(`Downloaded ${entry.file.name}.`);
    };

    const handleDownloadAll = async () => {
        const done = files.filter((f) => f.blob);
        if (!done.length || isProcessing || isZipping) return;

        setIsZipping(true);
        setError("");
        setShowProgress(true);
        setGlobalStage("Creating ZIP archive...");
        setGlobalProgress(20);

        try {
            const JSZip = (await import("jszip")).default;
            const zip = new JSZip();
            const ext = targetFormat === "jpg" ? "jpg" : "png";

            done.forEach((entry, index) => {
                zip.file(replaceExtension(entry.file.name, ext), entry.blob);
                setGlobalProgress(20 + Math.round(((index + 1) / done.length) * 70));
            });

            const zipBlob = await zip.generateAsync({ type: "blob" });
            triggerDownload(zipBlob, `heic-converted-${Date.now()}.zip`);
            setGlobalProgress(100);
            setGlobalStage(STAGE_LABELS[STAGES.DONE]);
            setStatus(`Downloaded ZIP with ${done.length} file(s).`);
        } catch (zipError) {
            setError(zipError.message || "Could not create ZIP archive.");
        } finally {
            setIsZipping(false);
        }
    };

    const doneCount = files.filter((f) => f.stage === STAGES.DONE).length;

    const left = (
        <>
            <div>
                <span className="img-tool__label">Output format</span>
                <div className="img-tool__segmented" role="group" aria-label="Output format">
                    <button
                        type="button"
                        className={`img-tool__segment cursor-target${targetFormat === "jpg" ? " is-active" : ""}`}
                        aria-pressed={targetFormat === "jpg"}
                        disabled={isProcessing || isZipping}
                        onClick={() => setTargetFormat("jpg")}
                    >
                        JPG
                    </button>
                    <button
                        type="button"
                        className={`img-tool__segment cursor-target${targetFormat === "png" ? " is-active" : ""}`}
                        aria-pressed={targetFormat === "png"}
                        disabled={isProcessing || isZipping}
                        onClick={() => setTargetFormat("png")}
                    >
                        PNG
                    </button>
                </div>
            </div>

            <div>
                <label className="img-tool__label" htmlFor="heic-quality">
                    Quality
                </label>
                <input
                    id="heic-quality"
                    className="img-tool__range"
                    type="range"
                    min={50}
                    max={100}
                    value={quality}
                    disabled={isProcessing || isZipping || targetFormat === "png"}
                    onChange={(e) => setQuality(Number(e.target.value))}
                />
                <div className="img-tool__range-meta">
                    <span>50%</span>
                    <span className="img-tool__range-value">
                        {targetFormat === "png" ? "N/A for PNG" : `${quality}%`}
                    </span>
                    <span>100%</span>
                </div>
            </div>

            <p className="img-tool__hint">
                Up to {MAX_FILES} files, {formatBytes(MAX_BYTES)} each. HEIC / HEIF only.
            </p>

            <div className="img-tool__actions">
                <button
                    type="button"
                    className="img-tool__btn img-tool__btn--primary cursor-target"
                    disabled={!doneCount || isProcessing || isZipping}
                    onClick={handleDownloadAll}
                >
                    Download All as ZIP
                </button>
                <button
                    type="button"
                    className="img-tool__btn cursor-target"
                    disabled={!files.length || isProcessing || isZipping}
                    onClick={resetAll}
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
                    if (!isProcessing && files.length < MAX_FILES) setIsDragging(true);
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
                    addFiles(e.dataTransfer.files);
                }}
                onClick={() => {
                    if (!isProcessing && files.length < MAX_FILES) fileInputRef.current?.click();
                }}
                role="button"
                tabIndex={isProcessing ? -1 : 0}
            >
                <input
                    ref={fileInputRef}
                    className="img-tool__dropzone-input"
                    type="file"
                    accept={HEIC_ACCEPT}
                    multiple
                    disabled={isProcessing || files.length >= MAX_FILES}
                    onChange={(e) => addFiles(e.target.files)}
                />
                <p className="img-tool__dropzone-text">
                    Drag &amp; drop HEIC / HEIF photos here
                    <br />
                    or click to browse — max {MAX_FILES} files, {formatBytes(MAX_BYTES)} each
                </p>
                <span className="img-tool__btn cursor-target">Choose Files</span>
            </div>

            {files.length > 0 && (
                <div className="img-tool__list">
                    {files.map((entry) => (
                        <div key={entry.id} className="img-tool__list-item">
                            {entry.thumbUrl ? (
                                <img
                                    className="img-tool__list-thumb"
                                    src={entry.thumbUrl}
                                    alt=""
                                />
                            ) : (
                                <div
                                    className="img-tool__list-thumb"
                                    style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                    {entry.stage !== STAGES.ERROR && entry.stage !== STAGES.DONE ? (
                                        <span className="img-tool__spinner" aria-hidden="true" />
                                    ) : null}
                                </div>
                            )}
                            <div className="img-tool__list-info">
                                <span className="img-tool__list-name">{entry.file.name}</span>
                                <span className="img-tool__list-meta">
                                    {formatBytes(entry.file.size)}
                                    {entry.outputSize ? ` → ${formatBytes(entry.outputSize)}` : ""}
                                    {entry.stage === STAGES.ERROR ? ` — ${entry.error}` : ""}
                                    {entry.stage !== STAGES.DONE &&
                                    entry.stage !== STAGES.ERROR
                                        ? ` — ${STAGE_LABELS[entry.stage] || "Processing"}`
                                        : ""}
                                </span>
                            </div>
                            <button
                                type="button"
                                className="img-tool__btn cursor-target"
                                disabled={!entry.blob || isProcessing || isZipping}
                                onClick={() => handleDownloadSingle(entry)}
                            >
                                Download
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    return (
        <ImageToolWorkspace
            title="HEIC to JPG"
            error={error}
            status={status}
            left={left}
            right={right}
            showProgress={showProgress}
            progressLabel={globalStage}
            progress={globalProgress}
        />
    );
}

export default HeicToJpg;

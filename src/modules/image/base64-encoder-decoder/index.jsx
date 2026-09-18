import { useCallback, useMemo, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import {copyTextToClipboard,
    formatBase64Output,
    formatBytes,
    IMAGE_ACCEPT,
    MB,
    normalizeImageDataUri,
    readFileAsDataURL,
    triggerDownload,
    validateStandardImage, preventDragDefaults } from "../_shared/imageToolUtils";
// preventDragDefaults imported below

const MAX_BYTES = 15 * MB;
const OUTPUT_FORMATS = [
    { id: "raw", label: "Raw URI" },
    { id: "html", label: "HTML img" },
    { id: "css", label: "CSS background" },
];

function Base64EncoderDecoder() {
    const [mode, setMode] = useState("encode");
    const [outputFormat, setOutputFormat] = useState("raw");
    const [dataUri, setDataUri] = useState("");
    const [decodeInput, setDecodeInput] = useState("");
    const [fileMeta, setFileMeta] = useState(null);
    const [decodePreviewError, setDecodePreviewError] = useState("");
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [progress, setProgress] = useState(0);
    const [showProgress, setShowProgress] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const outputText = useMemo(() => {
        if (!dataUri) return "";
        return formatBase64Output(dataUri, outputFormat);
    }, [dataUri, outputFormat]);

    const normalizedDecodeUri = useMemo(() => {
        if (!decodeInput.trim()) return null;
        return normalizeImageDataUri(decodeInput);
    }, [decodeInput]);

    const decodeValidationError = useMemo(() => {
        if (mode !== "decode" || !decodeInput.trim()) return "";
        if (!normalizedDecodeUri) return "Invalid Base64 or data URI.";
        return "";
    }, [mode, decodeInput, normalizedDecodeUri]);

    const displayError = error || decodeValidationError || decodePreviewError;

    const handleFile = useCallback(async (file) => {
        setError("");
        setStatus("");
        const validation = validateStandardImage(file, MAX_BYTES);
        if (!validation.ok) {
            setError(validation.error);
            return;
        }
        setShowProgress(true);
        setProgress(0);
        try {
            const result = await readFileAsDataURL(file, setProgress);
            setDataUri(result);
            setFileMeta({ name: file.name, size: file.size, type: file.type });
            setStatus("Image encoded successfully.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Encoding failed.");
        } finally {
            setShowProgress(false);
        }
    }, []);

    const onDrop = useCallback(
        (event) => {
            event.preventDefault();
            setIsDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) handleFile(file);
        },
        [handleFile],
    );

    const copyOutput = useCallback(async () => {
        if (!outputText) return;
        try {
            await copyTextToClipboard(outputText);
            setStatus("Copied to clipboard.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Copy failed.");
        }
    }, [outputText]);

    const downloadDecoded = useCallback(async () => {
        if (!normalizedDecodeUri) return;
        setShowProgress(true);
        setProgress(30);
        try {
            const image = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error("Could not decode image."));
                img.src = normalizedDecodeUri;
            });
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(image, 0, 0);
            setProgress(80);
            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(
                    (result) => (result ? resolve(result) : reject(new Error("Export failed."))),
                    "image/png",
                );
            });
            triggerDownload(blob, "decoded-image.png");
            setStatus("Decoded image downloaded.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Download failed.");
        } finally {
            setShowProgress(false);
            setProgress(0);
        }
    }, [normalizedDecodeUri]);

    const resetEncode = useCallback(() => {
        setDataUri("");
        setFileMeta(null);
        setError("");
        setStatus("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);

    const left = (
        <>
            <div className="img-tool__segmented" role="tablist" aria-label="Mode">
                <button
                    type="button"
                    role="tab"
                    className={`img-tool__segment cursor-target${mode === "encode" ? " is-active" : ""}`}
                    onClick={() => setMode("encode")}
                >
                    Image to Base64
                </button>
                <button
                    type="button"
                    role="tab"
                    className={`img-tool__segment cursor-target${mode === "decode" ? " is-active" : ""}`}
                    onClick={() => setMode("decode")}
                >
                    Base64 to Image
                </button>
            </div>

            {mode === "encode" ? (
                <>
                    <div
                        className={`img-tool__dropzone cursor-target${isDragging ? " is-dragging" : ""}`}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={IMAGE_ACCEPT}
                            className="img-tool__dropzone-input"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFile(file);
                            }}
                        />
                        <p className="img-tool__dropzone-text">
                            Drop an image or click to browse
                            <br />
                            <span>PNG, JPG, WEBP, BMP, GIF — max 15 MB</span>
                        </p>
                    </div>

                    {fileMeta ? (
                        <div className="img-tool__meta">
                            <span className="img-tool__chip">
                                <strong>File</strong> {fileMeta.name}
                            </span>
                            <span className="img-tool__chip">
                                <strong>Size</strong> {formatBytes(fileMeta.size)}
                            </span>
                        </div>
                    ) : null}

                    <div>
                        <span className="img-tool__label">Output format</span>
                        <div className="img-tool__segmented">
                            {OUTPUT_FORMATS.map((entry) => (
                                <button
                                    key={entry.id}
                                    type="button"
                                    className={`img-tool__segment cursor-target${outputFormat === entry.id ? " is-active" : ""}`}
                                    onClick={() => setOutputFormat(entry.id)}
                                    disabled={!dataUri}
                                >
                                    {entry.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="img-tool__actions">
                        <button
                            type="button"
                            className="img-tool__btn img-tool__btn--primary cursor-target"
                            onClick={copyOutput}
                            disabled={!outputText}
                        >
                            Copy to Clipboard
                        </button>
                        <button
                            type="button"
                            className="img-tool__btn cursor-target"
                            onClick={resetEncode}
                            disabled={!dataUri}
                        >
                            Clear
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <div>
                        <span className="img-tool__label">Paste Base64 or data URI</span>
                        <textarea
                            className="img-tool__textarea"
                            value={decodeInput}
                            onChange={(e) => setDecodeInput(e.target.value)}
                            placeholder="data:image/png;base64,iVBORw0KGgo..."
                            spellCheck={false}
                        />
                    </div>
                    <div className="img-tool__actions">
                        <button
                            type="button"
                            className="img-tool__btn img-tool__btn--primary cursor-target"
                            onClick={downloadDecoded}
                            disabled={!normalizedDecodeUri}
                        >
                            Download Decoded File
                        </button>
                        <button
                            type="button"
                            className="img-tool__btn cursor-target"
                            onClick={() => {
                                setDecodeInput("");
                                setDecodePreviewError("");
                                setError("");
                                setStatus("");
                            }}
                            disabled={!decodeInput}
                        >
                            Clear
                        </button>
                    </div>
                </>
            )}
        </>
    );

    const right = (
        <>
            {mode === "encode" ? (
                <>
                    <div className="img-tool__output-header">
                        <span className="img-tool__label" style={{ margin: 0 }}>Encoded output</span>
                        {outputText ? (
                            <span className="img-tool__char-count">
                                {outputText.length.toLocaleString()} chars
                            </span>
                        ) : null}
                    </div>
                    <textarea
                        className="img-tool__textarea"
                        value={outputText}
                        readOnly
                        placeholder="Upload an image to generate a Base64 data URI..."
                        spellCheck={false}
                    />
                </>
            ) : (
                <div className="img-tool__preview-frame">
                    {normalizedDecodeUri && !decodeValidationError ? (
                        <img
                            src={normalizedDecodeUri}
                            alt="Decoded preview"
                            className="img-tool__preview-image"
                            onLoad={() => setDecodePreviewError("")}
                            onError={() =>
                                setDecodePreviewError("Could not decode this image data.")
                            }
                        />
                    ) : (
                        <p className="img-tool__preview-empty">
                            Paste a valid data URI to preview the decoded image.
                        </p>
                    )}
                </div>
            )}
        </>
    );

    return (
        <ImageToolWorkspace
            title="Base64 Encoder / Decoder"
            error={displayError}
            status={status}
            left={left}
            right={right}
            progress={progress}
            progressLabel={mode === "encode" ? "Reading file" : "Decoding image"}
            showProgress={showProgress}
        />
    );
}

export default Base64EncoderDecoder;

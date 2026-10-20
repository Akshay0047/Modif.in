import { handleFilePickerKeyDown } from "../_shared/imageToolUtils";
import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import ImageToolRange from "../_shared/ImageToolRange";
import {MB,
    canvasToBlob,
    copyBlobToClipboard,
    formatBytes,
    loadImageFromUrl,
    normalizeHexColor,
    readFileWithProgress,
    replaceExtension,
    triggerDownload,
    validateFile,
    waitFrame, preventDragDefaults } from "../_shared/imageToolUtils";
// preventDragDefaults imported below

const MAX_BYTES = 15 * MB;
const SCALE_OPTIONS = [1, 2, 4, 8];

const STAGES = {
    IDLE: "idle",
    READING: "reading",
    PARSING: "parsing",
    RASTERIZING: "rasterizing",
    DONE: "done",
};

const STAGE_LABELS = {
    [STAGES.READING]: "Reading SVG...",
    [STAGES.PARSING]: "Parsing Vector XML...",
    [STAGES.RASTERIZING]: "Rasterizing...",
    [STAGES.DONE]: "Ready",
};

function validateSvgFile(file) {
    return validateFile(file, {
        maxBytes: MAX_BYTES,
        extensions: [/\.svg$/i],
        mimes: new Set(["image/svg+xml", ""]),
        sizeMessage: `File exceeds ${formatBytes(MAX_BYTES)} limit.`,
        typeMessage: "Unsupported file type. Please upload an SVG file.",
    });
}

function validateSvgMarkup(markup) {
    const trimmed = markup.trim();
    if (!trimmed) return { ok: false, error: "Paste SVG markup to convert." };
    if (!/<svg[\s>]/i.test(trimmed)) {
        return { ok: false, error: "Invalid SVG: root element must be <svg>." };
    }
    return { ok: true, svg: trimmed };
}

function parseSvgDimensions(svgText) {
    const viewBoxMatch = svgText.match(/viewBox=["']([^"']+)["']/i);
    const widthMatch = svgText.match(/\bwidth=["']([^"']+)["']/i);
    const heightMatch = svgText.match(/\bheight=["']([^"']+)["']/i);

    const parseNum = (value) => {
        if (!value) return null;
        const num = parseFloat(String(value).replace(/px|pt|em|rem|%$/i, ""));
        return Number.isFinite(num) && num > 0 ? num : null;
    };

    if (viewBoxMatch) {
        const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
            return { width: parts[2], height: parts[3] };
        }
    }

    const width = parseNum(widthMatch?.[1]);
    const height = parseNum(heightMatch?.[1]);
    if (width && height) return { width, height };
    return { width: 512, height: 512 };
}

async function rasterizeSvg(svgText, { width, height, bgMode, bgColor, format, quality }) {
    const blob = new Blob([svgText], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    try {
        const { image } = await loadImageFromUrl(url);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width));
        canvas.height = Math.max(1, Math.round(height));
        const ctx = canvas.getContext("2d");

        if (bgMode === "solid") {
            ctx.fillStyle = normalizeHexColor(bgColor);
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        const mime =
            format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
        const q = format === "png" ? undefined : quality / 100;
        return canvasToBlob(canvas, mime, q);
    } finally {
        URL.revokeObjectURL(url);
    }
}

function SvgToPngJpg() {
    const fileInputRef = useRef(null);
    const previewUrlRef = useRef("");
    const operationRef = useRef(0);

    const [inputTab, setInputTab] = useState("file");
    const [file, setFile] = useState(null);
    const [svgText, setSvgText] = useState("");
    const [baseDims, setBaseDims] = useState({ width: 512, height: 512 });
    const [scale, setScale] = useState(1);
    const [width, setWidth] = useState(512);
    const [height, setHeight] = useState(512);
    const [lockAspect, setLockAspect] = useState(true);
    const [bgMode, setBgMode] = useState("transparent");
    const [bgColor, setBgColor] = useState("#ffffff");
    const [format, setFormat] = useState("png");
    const [quality, setQuality] = useState(90);
    const [convertedBlob, setConvertedBlob] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [stage, setStage] = useState(STAGES.IDLE);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");

    const aspect = baseDims.width / baseDims.height;
    const isProcessing =
        stage === STAGES.READING || stage === STAGES.PARSING || stage === STAGES.RASTERIZING;

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

    const applyScale = useCallback(
        (nextScale) => {
            setScale(nextScale);
            setWidth(Math.round(baseDims.width * nextScale));
            setHeight(Math.round(baseDims.height * nextScale));
        },
        [baseDims],
    );

    const resetTool = useCallback(() => {
        operationRef.current += 1;
        revokePreviewUrl();
        setFile(null);
        setSvgText("");
        setBaseDims({ width: 512, height: 512 });
        setScale(1);
        setWidth(512);
        setHeight(512);
        setConvertedBlob(null);
        setPreviewUrl("");
        setError("");
        setStatus("");
        setStage(STAGES.IDLE);
        setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [revokePreviewUrl]);

    const loadSvgMarkup = useCallback((markup, sourceFile = null) => {
        const validation = validateSvgMarkup(markup);
        if (!validation.ok) {
            setError(validation.error);
            return;
        }

        revokePreviewUrl();
        setConvertedBlob(null);
        setPreviewUrl("");
        setError("");
        setStatus("");

        const dims = parseSvgDimensions(validation.svg);
        setBaseDims(dims);
        setScale(1);
        setWidth(Math.round(dims.width));
        setHeight(Math.round(dims.height));
        setSvgText(validation.svg);
        setFile(sourceFile);
        setStage(STAGES.PARSING);
        setProgress(30);
    }, [revokePreviewUrl]);

    const ingestFile = useCallback(
        async (nextFile) => {
            const validation = validateSvgFile(nextFile);
            if (!validation.ok) {
                setError(validation.error);
                return;
            }

            const operationId = operationRef.current + 1;
            operationRef.current = operationId;
            setStage(STAGES.READING);
            setProgress(10);
            setError("");

            try {
                const buffer = await readFileWithProgress(nextFile, (pct) => {
                    if (operationRef.current !== operationId) return;
                    setProgress(Math.round(pct * 0.25));
                });
                const text = new TextDecoder().decode(buffer);
                if (operationRef.current !== operationId) return;
                await loadSvgMarkup(text, nextFile);
            } catch (readError) {
                if (operationRef.current !== operationId) return;
                setError(readError.message || "Could not read SVG file.");
                setStage(STAGES.IDLE);
                setProgress(0);
            }
        },
        [loadSvgMarkup],
    );

    useEffect(() => {
        if (!svgText) return undefined;

        const operationId = operationRef.current + 1;
        operationRef.current = operationId;
        let cancelled = false;

        const rerun = async () => {
            setStage(STAGES.RASTERIZING);
            setProgress(60);
            await waitFrame();
            if (cancelled || operationRef.current !== operationId) return;

            try {
                const blob = await rasterizeSvg(svgText, {
                    width,
                    height,
                    bgMode,
                    bgColor,
                    format,
                    quality,
                });
                if (cancelled || operationRef.current !== operationId) return;
                setConvertedBlob(blob);
                setPreviewFromBlob(blob);
                setStage(STAGES.DONE);
                setProgress(100);
            } catch (rasterError) {
                if (cancelled || operationRef.current !== operationId) return;
                setError(rasterError.message || "Rasterization failed.");
                setStage(STAGES.IDLE);
                setProgress(0);
            }
        };

        rerun();
        return () => {
            cancelled = true;
        };
    }, [width, height, bgMode, bgColor, format, quality, svgText, setPreviewFromBlob]);

    useEffect(
        () => () => {
            operationRef.current += 1;
            revokePreviewUrl();
        },
        [revokePreviewUrl],
    );

    const handleWidthChange = (value) => {
        const next = Math.max(1, Number(value) || 1);
        setWidth(next);
        if (lockAspect) setHeight(Math.max(1, Math.round(next / aspect)));
        setScale(next / baseDims.width);
    };

    const handleHeightChange = (value) => {
        const next = Math.max(1, Number(value) || 1);
        setHeight(next);
        if (lockAspect) setWidth(Math.max(1, Math.round(next * aspect)));
        setScale(next / baseDims.height);
    };

    const handleDownload = () => {
        if (!convertedBlob || isProcessing) return;
        const name = file?.name || "vector.svg";
        triggerDownload(convertedBlob, replaceExtension(name, format));
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
            setError(copyError.message);
        }
    };

    const hasSvg = Boolean(svgText);
    const canExport = Boolean(convertedBlob) && stage === STAGES.DONE && !isProcessing;

    const left = (
        <>
            <div>
                <span className="img-tool__label">Scale</span>
                <div className="img-tool__tabs" role="group" aria-label="Resolution scale">
                    {SCALE_OPTIONS.map((option) => (
                        <button aria-pressed={scale === option}
                            key={option}
                            type="button"
                            className={`img-tool__tab cursor-target${scale === option ? " is-active" : ""}`}
                            disabled={!hasSvg || isProcessing}
                            onClick={() => applyScale(option)}
                        >
                            {option}x
                        </button>
                    ))}
                </div>
            </div>

            <div className="img-tool__dim-row">
                <div>
                    <label className="img-tool__label" htmlFor="svg-width">Width (px)</label>
                    <input
                        id="svg-width"
                        className="img-tool__input"
                        type="number"
                        min={1}
                        value={width}
                        disabled={!hasSvg || isProcessing}
                        onChange={(e) => handleWidthChange(e.target.value)}
                    />
                </div>
                <div>
                    <label className="img-tool__label" htmlFor="svg-height">Height (px)</label>
                    <input
                        id="svg-height"
                        className="img-tool__input"
                        type="number"
                        min={1}
                        value={height}
                        disabled={!hasSvg || isProcessing}
                        onChange={(e) => handleHeightChange(e.target.value)}
                    />
                </div>
            </div>

            <button
                type="button"
                className={`img-tool__btn cursor-target${lockAspect ? " img-tool__btn--primary" : ""}`}
                disabled={!hasSvg || isProcessing}
                onClick={() => setLockAspect((v) => !v)}
            >
                {lockAspect ? "Aspect Locked" : "Aspect Unlocked"}
            </button>

            <div>
                <span className="img-tool__label">Background</span>
                <div className="img-tool__segmented" role="group" aria-label="Background mode">
                    <button aria-pressed={bgMode === "transparent"}
                        type="button"
                        className={`img-tool__segment cursor-target${bgMode === "transparent" ? " is-active" : ""}`}
                        disabled={isProcessing}
                        onClick={() => setBgMode("transparent")}
                    >
                        Transparent
                    </button>
                    <button aria-pressed={bgMode === "solid"}
                        type="button"
                        className={`img-tool__segment cursor-target${bgMode === "solid" ? " is-active" : ""}`}
                        disabled={isProcessing}
                        onClick={() => setBgMode("solid")}
                    >
                        Solid Color
                    </button>
                </div>
            </div>

            {bgMode === "solid" && (
                <div className="img-tool__color-row">
                    <input
                        className="img-tool__color-input cursor-target"
                        type="color"
                        value={bgColor}
                        disabled={isProcessing}
                        onChange={(e) => setBgColor(e.target.value)}
                        aria-label="Background color"
                    />
                    <input aria-label="Background color hex value"
                        className="img-tool__input"
                        type="text"
                        value={bgColor}
                        disabled={isProcessing}
                        maxLength={7}
                        spellCheck={false}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (/^#?[0-9a-fA-F]{0,6}$/.test(value)) {
                                setBgColor(value.startsWith("#") ? value : `#${value}`);
                            }
                        }}
                    />
                </div>
            )}

            <div>
                <label className="img-tool__label" htmlFor="svg-format">Output format</label>
                <select
                    id="svg-format"
                    className="img-tool__select"
                    value={format}
                    disabled={isProcessing}
                    onChange={(e) => setFormat(e.target.value)}
                >
                    <option value="png">PNG</option>
                    <option value="jpg">JPG</option>
                    <option value="webp">WEBP</option>
                </select>
            </div>

            {format !== "png" && (
                <ImageToolRange
                    id="svg-quality"
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
            )}

            <div className="img-tool__actions">
                <button
                    type="button"
                    className="img-tool__btn img-tool__btn--primary cursor-target"
                    disabled={!canExport}
                    onClick={handleDownload}
                >
                    Download
                </button>
                <button
                    type="button"
                    className="img-tool__btn cursor-target"
                    disabled={!canExport}
                    onClick={handleCopy}
                >
                    Copy
                </button>
                <button
                    type="button"
                    className="img-tool__btn cursor-target"
                    disabled={isProcessing && !hasSvg}
                    onClick={resetTool}
                >
                    Reset
                </button>
            </div>
        </>
    );

    const right = (
        <>
            <div className="img-tool__tabs" role="group" aria-label="SVG input method">
                <button
                    type="button"
                    aria-pressed={inputTab === "file"}
                    className={`img-tool__tab cursor-target${inputTab === "file" ? " is-active" : ""}`}
                    disabled={isProcessing}
                    onClick={() => setInputTab("file")}
                >
                    Upload File
                </button>
                <button
                    type="button"
                    aria-pressed={inputTab === "paste"}
                    className={`img-tool__tab cursor-target${inputTab === "paste" ? " is-active" : ""}`}
                    disabled={isProcessing}
                    onClick={() => setInputTab("paste")}
                >
                    Paste SVG Code
                </button>
            </div>

            {inputTab === "file" ? (
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
                    onKeyDown={handleFilePickerKeyDown}
                role="button"
                    tabIndex={isProcessing ? -1 : 0}
                >
                    <input
                        ref={fileInputRef}
                        className="img-tool__dropzone-input"
                        type="file"
                        accept=".svg,image/svg+xml"
                        disabled={isProcessing}
                        onChange={(e) => {
                            const nextFile = e.target.files?.[0];
                            if (nextFile) ingestFile(nextFile);
                        }}
                    />
                    <p className="img-tool__dropzone-text">
                        {file ? (
                            <>
                                <span style={{ color: "#f8fafc", fontWeight: 600 }}>{file.name}</span>
                                <br />
                                Drop a new SVG or click to replace
                            </>
                        ) : (
                            <>
                                Drag &amp; drop an SVG file here
                                <br />
                                or click to browse — max {formatBytes(MAX_BYTES)}
                            </>
                        )}
                    </p>
                    <span className="img-tool__btn cursor-target">Choose File</span>
                </div>
            ) : (
                <>
                    <textarea aria-label="SVG source code"
                        className="img-tool__textarea"
                        placeholder="<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; ...>"
                        value={svgText}
                        disabled={isProcessing}
                        onChange={(e) => setSvgText(e.target.value)}
                        spellCheck={false}
                    />
                    <button
                        type="button"
                        className="img-tool__btn img-tool__btn--primary cursor-target"
                        disabled={!svgText.trim() || isProcessing}
                        onClick={() => loadSvgMarkup(svgText)}
                    >
                        Parse &amp; Preview
                    </button>
                </>
            )}

            {hasSvg && (
                <div className="img-tool__meta">
                    <span className="img-tool__chip">
                        Output: <strong>{width}</strong> × <strong>{height}</strong> px
                    </span>
                    {convertedBlob && (
                        <span className="img-tool__chip">
                            Size: <strong>{formatBytes(convertedBlob.size)}</strong>
                        </span>
                    )}
                </div>
            )}

            <div className="img-tool__preview-frame">
                {previewUrl ? (
                    <img className="img-tool__preview-image" src={previewUrl} alt="Rasterized preview" />
                ) : (
                    <p className="img-tool__preview-empty">
                        {hasSvg ? "Rendering preview…" : "Upload or paste SVG to preview"}
                    </p>
                )}
            </div>
        </>
    );

    return (
        <ImageToolWorkspace
            inputInPreview
            title="SVG to PNG / JPG"
            error={error}
            status={status}
            left={left}
            right={right}
            showProgress={stage !== STAGES.IDLE}
            progressLabel={STAGE_LABELS[stage] || ""}
            progress={progress}
        />
    );
}

export default SvgToPngJpg;

import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import {
    MB,
    canvasToBlob,
    formatBytes,
    loadImageFromBuffer,
    readFileWithProgress,
    triggerDownload,
    validateStandardImage,
    preventDragDefaults,
} from "../_shared/imageToolUtils";
// preventDragDefaults imported below

const MAX_FILES = 20;
const MAX_BYTES = 30 * MB;

const PAGE_SIZES = {
    fit: null,
    a4: { width: 595.28, height: 841.89 },
    letter: { width: 612, height: 792 },
};

const MARGINS = {
    none: 0,
    small: (10 * 72) / 25.4,
    large: (20 * 72) / 25.4,
};

const STAGES = {
    LOADING: "loading",
    LAYOUT: "layout",
    COMPILING: "compiling",
    DONE: "done",
};

const STAGE_LABELS = {
    [STAGES.LOADING]: "Loading Images...",
    [STAGES.LAYOUT]: "Computing Page Layouts...",
    [STAGES.COMPILING]: "Compiling PDF...",
    [STAGES.DONE]: "Done",
};

function resolvePageSize(pageSizeKey, orientation, imageWidth, imageHeight) {
    if (pageSizeKey === "fit") {
        return { width: imageWidth, height: imageHeight };
    }

    const base = PAGE_SIZES[pageSizeKey];
    if (orientation === "landscape") {
        return { width: base.height, height: base.width };
    }
    if (orientation === "portrait") {
        return { width: base.width, height: base.height };
    }

    const landscape = imageWidth >= imageHeight;
    return landscape
        ? { width: base.height, height: base.width }
        : { width: base.width, height: base.height };
}

function computeDrawRect(pageW, pageH, imgW, imgH, margin, alignment) {
    const innerW = pageW - margin * 2;
    const innerH = pageH - margin * 2;

    if (alignment === "stretch") {
        return { x: margin, y: margin, width: innerW, height: innerH };
    }

    const scale = Math.min(innerW / imgW, innerH / imgH);
    const width = imgW * scale;
    const height = imgH * scale;
    const x = margin + (innerW - width) / 2;

    if (alignment === "top") {
        return { x, y: margin, width, height };
    }

    const y = margin + (innerH - height) / 2;
    return { x, y, width, height };
}

function ImageToPdf() {
    const fileInputRef = useRef(null);
    const thumbUrlsRef = useRef([]);
    const operationRef = useRef(0);

    const [items, setItems] = useState([]);
    const [pageSize, setPageSize] = useState("fit");
    const [orientation, setOrientation] = useState("auto");
    const [marginKey, setMarginKey] = useState("none");
    const [alignment, setAlignment] = useState("center");
    const [docTitle, setDocTitle] = useState("Image Document");
    const [pdfQuality, setPdfQuality] = useState(85);
    const [includePageNumbers, setIncludePageNumbers] = useState(false);
    const [pageNumberPosition, setPageNumberPosition] = useState("center");
    const [pageNumberSize, setPageNumberSize] = useState(10);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [stage, setStage] = useState("");
    const [progress, setProgress] = useState(0);
    const [showProgress, setShowProgress] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const revokeThumbUrls = useCallback(() => {
        thumbUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        thumbUrlsRef.current = [];
    }, []);

    const clearAll = useCallback(() => {
        operationRef.current += 1;
        revokeThumbUrls();
        setItems([]);
        setError("");
        setStatus("");
        setStage("");
        setProgress(0);
        setShowProgress(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [revokeThumbUrls]);

    const addFiles = useCallback(
        async (incoming) => {
            const list = Array.from(incoming);
            if (!list.length) return;

            const remaining = MAX_FILES - items.length;
            if (remaining <= 0) {
                setError(`Maximum ${MAX_FILES} images allowed.`);
                return;
            }

            const operationId = operationRef.current;
            const accepted = [];

            for (const file of list.slice(0, remaining)) {
                const validation = validateStandardImage(file, MAX_BYTES);
                if (!validation.ok) {
                    setError(validation.error);
                    continue;
                }

                try {
                    const buffer = await readFileWithProgress(file);
                    if (operationRef.current !== operationId) return;

                    const loaded = await loadImageFromBuffer(
                        buffer,
                        file.type || "application/octet-stream",
                    );
                    thumbUrlsRef.current.push(loaded.objectUrl);

                    accepted.push({
                        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
                        file,
                        buffer,
                        thumbUrl: loaded.objectUrl,
                        width: loaded.width,
                        height: loaded.height,
                    });
                } catch (loadError) {
                    setError(loadError.message || "Could not load image.");
                }
            }

            if (accepted.length) {
                setError("");
                setItems((prev) => [...prev, ...accepted]);
            }
        },
        [items.length],
    );

    useEffect(
        () => () => {
            operationRef.current += 1;
            revokeThumbUrls();
        },
        [revokeThumbUrls],
    );

    const moveItem = (index, direction) => {
        const target = index + direction;
        if (target < 0 || target >= items.length) return;
        setItems((prev) => {
            const next = [...prev];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    };

    const removeItem = (id) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const embedCompressedImage = async (pdfDoc, item, quality) => {
        const { image } = await loadImageFromBuffer(
            item.buffer,
            item.file.type || "application/octet-stream",
        );
        const canvas = document.createElement("canvas");
        canvas.width = item.width;
        canvas.height = item.height;
        const ctx = canvas.getContext("2d");
        const isJpeg =
            item.file.type === "image/jpeg" ||
            item.file.type === "image/jpg" ||
            /\.jpe?g$/i.test(item.file.name);
        if (!isJpeg) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, item.width, item.height);
        }
        ctx.drawImage(image, 0, 0);
        const jpegBuffer = await canvasToBlob(canvas, "image/jpeg", quality / 100);
        const arrayBuffer = await jpegBuffer.arrayBuffer();
        return pdfDoc.embedJpg(arrayBuffer);
    };

    const handleGenerate = async () => {
        if (!items.length || isGenerating) return;

        setIsGenerating(true);
        setShowProgress(true);
        setError("");
        setStatus("");
        setStage(STAGE_LABELS[STAGES.LOADING]);
        setProgress(10);

        try {
            const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
            const pdfDoc = await PDFDocument.create();
            pdfDoc.setTitle(docTitle || "Image Document");
            const pageNumberFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

            const margin = MARGINS[marginKey];

            for (let i = 0; i < items.length; i += 1) {
                const item = items[i];
                setStage(`${STAGE_LABELS[STAGES.LAYOUT]} (${i + 1} of ${items.length})`);
                setProgress(15 + Math.round((i / items.length) * 45));

                const pageDims = resolvePageSize(
                    pageSize,
                    orientation,
                    item.width,
                    item.height,
                );

                const page = pdfDoc.addPage([pageDims.width, pageDims.height]);
                const embedded = await embedCompressedImage(pdfDoc, item, pdfQuality);

                const rect = computeDrawRect(
                    pageDims.width,
                    pageDims.height,
                    embedded.width,
                    embedded.height,
                    margin,
                    alignment,
                );

                page.drawImage(embedded, rect);

                if (includePageNumbers) {
                    const label = String(i + 1);
                    const textWidth = pageNumberFont.widthOfTextAtSize(label, pageNumberSize);
                    const x = pageNumberPosition === "right"
                        ? pageDims.width - margin - textWidth
                        : (pageDims.width - textWidth) / 2;
                    page.drawText(label, {
                        x: Math.max(margin, x),
                        y: Math.max(12, margin * 0.4),
                        size: pageNumberSize,
                        font: pageNumberFont,
                        color: rgb(0.45, 0.45, 0.45),
                    });
                }
            }

            setStage(STAGE_LABELS[STAGES.COMPILING]);
            setProgress(85);

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: "application/pdf" });
            const safeTitle = (docTitle || "images").replace(/[^\w-]+/g, "-").toLowerCase();
            triggerDownload(blob, `${safeTitle || "document"}.pdf`);

            setStage(STAGE_LABELS[STAGES.DONE]);
            setProgress(100);
            setStatus("PDF download started.");
        } catch (genError) {
            setError(genError.message || "PDF generation failed.");
            setShowProgress(false);
        } finally {
            setIsGenerating(false);
        }
    };

    const left = (
        <>
            <div>
                <label className="img-tool__label" htmlFor="pdf-title">Document title</label>
                <input
                    id="pdf-title"
                    className="img-tool__input"
                    type="text"
                    value={docTitle}
                    disabled={isGenerating}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Image Document"
                />
            </div>

            <div>
                <label className="img-tool__label" htmlFor="pdf-page-size">Page size</label>
                <select
                    id="pdf-page-size"
                    className="img-tool__select"
                    value={pageSize}
                    disabled={isGenerating}
                    onChange={(e) => setPageSize(e.target.value)}
                >
                    <option value="fit">Fit to Image</option>
                    <option value="a4">A4</option>
                    <option value="letter">US Letter</option>
                </select>
            </div>

            <div>
                <span className="img-tool__label">Orientation</span>
                <div className="img-tool__segmented" role="group" aria-label="Page orientation">
                    {["auto", "portrait", "landscape"].map((opt) => (
                        <button
                            key={opt}
                            type="button"
                            className={`img-tool__segment cursor-target${orientation === opt ? " is-active" : ""}`}
                            disabled={isGenerating || pageSize === "fit"}
                            onClick={() => setOrientation(opt)}
                        >
                            {opt === "auto" ? "Auto" : opt === "portrait" ? "Portrait" : "Landscape"}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <span className="img-tool__label">Margins</span>
                <div className="img-tool__segmented" role="group" aria-label="Page margins">
                    {[
                        ["none", "None"],
                        ["small", "Small"],
                        ["large", "Large"],
                    ].map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            className={`img-tool__segment cursor-target${marginKey === key ? " is-active" : ""}`}
                            disabled={isGenerating}
                            onClick={() => setMarginKey(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <span className="img-tool__label">Alignment</span>
                <div className="img-tool__segmented" role="group" aria-label="Image alignment">
                    {[
                        ["center", "Center"],
                        ["top", "Top"],
                        ["stretch", "Stretch"],
                    ].map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            className={`img-tool__segment cursor-target${alignment === key ? " is-active" : ""}`}
                            disabled={isGenerating}
                            onClick={() => setAlignment(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="img-tool__label" htmlFor="pdf-quality">PDF quality / compression</label>
                <input
                    id="pdf-quality"
                    className="img-tool__range"
                    type="range"
                    min={30}
                    max={100}
                    value={pdfQuality}
                    disabled={isGenerating}
                    onChange={(e) => setPdfQuality(Number(e.target.value))}
                />
                <div className="img-tool__range-meta">
                    <span>Smaller file</span>
                    <span className="img-tool__range-value">{pdfQuality}%</span>
                    <span>Higher quality</span>
                </div>
            </div>

            <label className="img-tool__checkbox-row">
                <input
                    type="checkbox"
                    checked={includePageNumbers}
                    disabled={isGenerating}
                    onChange={(e) => setIncludePageNumbers(e.target.checked)}
                />
                Include page numbers
            </label>

            {includePageNumbers && (
                <>
                    <div>
                        <span className="img-tool__label">Page number position</span>
                        <div className="img-tool__segmented">
                            {[
                                ["center", "Bottom Center"],
                                ["right", "Bottom Right"],
                            ].map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    className={`img-tool__segment${pageNumberPosition === key ? " is-active" : ""}`}
                                    disabled={isGenerating}
                                    onClick={() => setPageNumberPosition(key)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="img-tool__label" htmlFor="pdf-page-num-size">Page number size</label>
                        <input
                            id="pdf-page-num-size"
                            className="img-tool__range"
                            type="range"
                            min={8}
                            max={18}
                            value={pageNumberSize}
                            disabled={isGenerating}
                            onChange={(e) => setPageNumberSize(Number(e.target.value))}
                        />
                        <div className="img-tool__range-meta">
                            <span>8pt</span>
                            <span className="img-tool__range-value">{pageNumberSize}pt</span>
                            <span>18pt</span>
                        </div>
                    </div>
                </>
            )}

            <p className="img-tool__hint">
                Up to {MAX_FILES} images, {formatBytes(MAX_BYTES)} each. PNG, JPG, JPEG, WEBP.
            </p>

            <div className="img-tool__actions">
                <button
                    type="button"
                    className="img-tool__btn img-tool__btn--primary cursor-target"
                    disabled={!items.length || isGenerating}
                    onClick={handleGenerate}
                >
                    Generate &amp; Download PDF
                </button>
                <button
                    type="button"
                    className="img-tool__btn cursor-target"
                    disabled={!items.length || isGenerating}
                    onClick={clearAll}
                >
                    Clear All
                </button>
            </div>
        </>
    );

    const right = (
        <>
            <div
                className={`img-tool__dropzone${isDragging ? " is-dragging" : ""}${isGenerating ? " is-disabled" : ""}`}
                onDragEnter={(e) => {
                    preventDragDefaults(e);
                    if (!isGenerating && items.length < MAX_FILES) setIsDragging(true);
                }}
                onDragOver={preventDragDefaults}
                onDragLeave={(e) => {
                    preventDragDefaults(e);
                    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
                }}
                onDrop={(e) => {
                    preventDragDefaults(e);
                    setIsDragging(false);
                    if (isGenerating) return;
                    addFiles(e.dataTransfer.files);
                }}
                onClick={() => {
                    if (!isGenerating && items.length < MAX_FILES) fileInputRef.current?.click();
                }}
                role="button"
                tabIndex={isGenerating ? -1 : 0}
            >
                <input
                    ref={fileInputRef}
                    className="img-tool__dropzone-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                    multiple
                    disabled={isGenerating || items.length >= MAX_FILES}
                    onChange={(e) => addFiles(e.target.files)}
                />
                <p className="img-tool__dropzone-text">
                    Drag &amp; drop images here or click to browse
                    <br />
                    Reorder thumbnails below — max {MAX_FILES} images
                </p>
                <span className="img-tool__btn cursor-target">Choose Images</span>
            </div>

            {items.length > 0 && (
                <div className="img-tool__thumb-grid">
                    {items.map((item, index) => (
                        <div key={item.id} className="img-tool__thumb-card">
                            <img src={item.thumbUrl} alt={item.file.name} />
                            <span className="img-tool__list-meta" title={item.file.name}>
                                {item.file.name}
                            </span>
                            <span className="img-tool__list-meta">
                                {formatBytes(item.file.size)} · {item.width}×{item.height}
                            </span>
                            <div className="img-tool__thumb-actions">
                                <button
                                    type="button"
                                    className="img-tool__btn cursor-target"
                                    disabled={index === 0 || isGenerating}
                                    onClick={() => moveItem(index, -1)}
                                    aria-label="Move up"
                                >
                                    ↑
                                </button>
                                <button
                                    type="button"
                                    className="img-tool__btn cursor-target"
                                    disabled={index === items.length - 1 || isGenerating}
                                    onClick={() => moveItem(index, 1)}
                                    aria-label="Move down"
                                >
                                    ↓
                                </button>
                                <button
                                    type="button"
                                    className="img-tool__btn cursor-target"
                                    disabled={isGenerating}
                                    onClick={() => removeItem(item.id)}
                                    aria-label="Remove"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    return (
        <ImageToolWorkspace
            title="Image to PDF"
            error={error}
            status={status}
            left={left}
            right={right}
            showProgress={showProgress}
            progressLabel={stage}
            progress={progress}
        />
    );
}

export default ImageToPdf;

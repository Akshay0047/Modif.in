export const MB = 1024 * 1024;

/** Safari / mobile crash guard — max 16 megapixels per canvas. */
export const MAX_CANVAS_PIXELS = 16_777_216;

export function clampDimensions(width, height, maxPixels = MAX_CANVAS_PIXELS) {
    const safeWidth = Math.max(1, Math.round(width));
    const safeHeight = Math.max(1, Math.round(height));
    const pixels = safeWidth * safeHeight;
    if (pixels <= maxPixels) {
        return { width: safeWidth, height: safeHeight, scaled: false };
    }
    const ratio = Math.sqrt(maxPixels / pixels);
    return {
        width: Math.max(1, Math.floor(safeWidth * ratio)),
        height: Math.max(1, Math.floor(safeHeight * ratio)),
        scaled: true,
    };
}

export function preventDragDefaults(event) {
    event.preventDefault();
    event.stopPropagation();
}

/** Give custom file-picker panels the same activation keys as a button. */
export function handleFilePickerKeyDown(event) {
    if (event.target !== event.currentTarget || event.repeat) return;
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (event.currentTarget.getAttribute("aria-disabled") !== "true") {
            event.currentTarget.click();
        }
    }
}

export function createDropzoneHandlers({ onFile, disabled = false, setDragging, multiple = false }) {
    return {
        onDragEnter: (event) => {
            preventDragDefaults(event);
            if (!disabled) setDragging?.(true);
        },
        onDragOver: preventDragDefaults,
        onDragLeave: (event) => {
            preventDragDefaults(event);
            if (!event.currentTarget.contains(event.relatedTarget)) {
                setDragging?.(false);
            }
        },
        onDrop: (event) => {
            preventDragDefaults(event);
            setDragging?.(false);
            if (disabled) return;
            const files = event.dataTransfer.files;
            if (!files?.length) return;
            if (multiple) onFile?.(files);
            else onFile?.(files[0]);
        },
    };
}

export function setupHiDPICanvas(canvas, displayWidth, displayHeight) {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(displayWidth));
    const height = Math.max(1, Math.round(displayHeight));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not supported in this browser.");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, dpr, width, height };
}

export function paintJpegBackground(ctx, width, height, backgroundColor = "#FFFFFF") {
    ctx.fillStyle = normalizeHexColor(backgroundColor);
    ctx.fillRect(0, 0, width, height);
}

async function blobToPngBlob(blob) {
    if (blob.type === "image/png") return blob;

    if (typeof createImageBitmap === "function") {
        const bitmap = await createImageBitmap(blob);
        const { canvas, ctx } = createCanvas(bitmap.width, bitmap.height);
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close?.();
        return canvasToBlob(canvas, "image/png");
    }

    const objectUrl = URL.createObjectURL(blob);
    try {
        const { image } = await loadImageFromUrl(objectUrl);
        const { canvas, ctx } = createCanvas(image.naturalWidth, image.naturalHeight);
        ctx.drawImage(image, 0, 0);
        return canvasToBlob(canvas, "image/png");
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

export function formatBytes(bytes) {
    if (bytes == null || Number.isNaN(bytes)) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / MB).toFixed(2)} MB`;
}

export function formatSavingsPercent(originalSize, convertedSize) {
    if (!originalSize || !convertedSize) return null;
    const delta = ((originalSize - convertedSize) / originalSize) * 100;
    if (delta >= 0.05) return `${delta.toFixed(1)}% saved`;
    if (delta <= -0.05) return `${Math.abs(delta).toFixed(1)}% larger`;
    return "Same size";
}

export function compressionRatio(originalSize, convertedSize) {
    if (!originalSize || !convertedSize) return "—";
    const ratio = originalSize / convertedSize;
    if (!Number.isFinite(ratio) || ratio <= 0) return "—";
    return `${ratio.toFixed(2)}×`;
}

export function normalizeHexColor(color, fallback = "#FFFFFF") {
    if (typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)) return color;
    return fallback;
}

export function validateFile(file, { maxBytes, extensions, mimes, sizeMessage, typeMessage }) {
    if (!file) return { ok: false, error: "No file selected." };
    if (file.size > maxBytes) {
        return { ok: false, error: sizeMessage || `File exceeds ${formatBytes(maxBytes)} limit.` };
    }
    const extOk = extensions.some((re) => re.test(file.name));
    if (!extOk) return { ok: false, error: typeMessage || "Unsupported file type." };
    if (file.type && file.type !== "" && mimes && !mimes.has(file.type)) {
        return { ok: false, error: typeMessage || "Unsupported file type." };
    }
    return { ok: true };
}

export function readFileWithProgress(file, onProgress) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onprogress = (event) => {
            if (!event.lengthComputable) return;
            onProgress?.(Math.round((event.loaded / event.total) * 100));
        };
        reader.onload = () => {
            onProgress?.(100);
            resolve(reader.result);
        };
        reader.onerror = () => reject(new Error("Could not read this file."));
        reader.onabort = () => reject(new Error("File read was cancelled."));
        reader.readAsArrayBuffer(file);
    });
}

export function loadImageFromBuffer(buffer, mimeType = "application/octet-stream") {
    return new Promise((resolve, reject) => {
        const blob = new Blob([buffer], { type: mimeType });
        const objectUrl = URL.createObjectURL(blob);
        const image = new Image();
        image.onload = () =>
            resolve({
                image,
                objectUrl,
                width: image.naturalWidth,
                height: image.naturalHeight,
            });
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Could not decode this image."));
        };
        image.src = objectUrl;
    });
}

export async function loadImageFromFileWithProgress(file, onProgress) {
    const buffer = await readFileWithProgress(file, onProgress);
    return loadImageFromBuffer(buffer, file.type || "application/octet-stream");
}

export function loadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () =>
            resolve({
                image,
                width: image.naturalWidth,
                height: image.naturalHeight,
            });
        image.onerror = () => reject(new Error("Could not load image."));
        image.src = url;
    });
}

export function waitFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function canvasToBlob(canvas, mimeType, quality, jpegBackground = "#FFFFFF") {
    let targetCanvas = canvas;
    let resolvedMime = mimeType;

    if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
        const flat = document.createElement("canvas");
        flat.width = canvas.width;
        flat.height = canvas.height;
        const ctx = flat.getContext("2d");
        if (!ctx) {
            return Promise.reject(new Error("Canvas is not supported in this browser."));
        }
        paintJpegBackground(ctx, flat.width, flat.height, jpegBackground);
        ctx.drawImage(canvas, 0, 0);
        targetCanvas = flat;
        resolvedMime = "image/jpeg";
    }

    return new Promise((resolve, reject) => {
        const normalizedQuality =
            resolvedMime === "image/png"
                ? undefined
                : clamp(typeof quality === "number" ? quality : 0.92, 0.01, 1);

        targetCanvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Export failed."))),
            resolvedMime,
            normalizedQuality,
        );
    });
}

export function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

export async function copyBlobToClipboard(blob) {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
        throw new Error("Clipboard images are not supported in this browser.");
    }
    try {
        const pngBlob = await blobToPngBlob(blob);
        await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
    } catch {
        throw new Error("Could not copy to clipboard. Try downloading instead.");
    }
}

export function replaceExtension(name, ext) {
    const base = name.replace(/\.[^.]+$/, "") || "image";
    return `${base}.${ext}`;
}

export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export const IMAGE_MIMES = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/bmp",
    "image/gif",
]);

export const IMAGE_EXT = /\.(png|jpe?g|webp|bmp|gif)$/i;
export const IMAGE_ACCEPT =
    "image/png,image/jpeg,image/webp,image/bmp,image/gif,.png,.jpg,.jpeg,.webp,.bmp,.gif";

export function validateStandardImage(file, maxBytes = 30 * MB) {
    return validateFile(file, {
        maxBytes,
        extensions: [IMAGE_EXT],
        mimes: IMAGE_MIMES,
        sizeMessage:
            "File exceeds 30 MB limit. Please choose a smaller image to preserve browser memory.",
        typeMessage:
            "Unsupported file type. Please upload PNG, JPG, JPEG, WEBP, BMP, or GIF.",
    });
}

export const EXIF_MIMES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/tiff",
]);

export const EXIF_EXT = /\.(jpe?g|png|tiff?|tif)$/i;

export const EXIF_ACCEPT =
    "image/jpeg,image/png,image/tiff,.jpg,.jpeg,.png,.tiff,.tif";

export function validateExifImage(file, maxBytes = 40 * MB) {
    return validateFile(file, {
        maxBytes,
        extensions: [EXIF_EXT],
        mimes: EXIF_MIMES,
        sizeMessage:
            "File exceeds 40 MB limit. Please choose a smaller image to preserve browser memory.",
        typeMessage: "Unsupported file type. Please upload JPG, JPEG, TIFF, or PNG.",
    });
}

export function readFileAsDataURL(file, onProgress) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onprogress = (event) => {
            if (!event.lengthComputable) return;
            onProgress?.(Math.round((event.loaded / event.total) * 100));
        };
        reader.onload = () => {
            onProgress?.(100);
            resolve(reader.result);
        };
        reader.onerror = () => reject(new Error("Could not read this file."));
        reader.onabort = () => reject(new Error("File read was cancelled."));
        reader.readAsDataURL(file);
    });
}

export async function copyTextToClipboard(text) {
    if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard is not supported in this browser.");
    }
    await navigator.clipboard.writeText(text);
}

export function rgbToHex(r, g, b) {
    return `#${[r, g, b]
        .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0"))
        .join("")}`;
}

export function rgbToCss(r, g, b) {
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function colorDistance(c1, c2) {
    return Math.sqrt(
        (c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2,
    );
}

export function downsampleImageData(image, maxSize = 150) {
    const aspect = image.naturalWidth / image.naturalHeight;
    let width;
    let height;
    if (aspect >= 1) {
        width = maxSize;
        height = Math.max(1, Math.round(maxSize / aspect));
    } else {
        height = maxSize;
        width = Math.max(1, Math.round(maxSize * aspect));
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
}

export function extractDominantColors(imageData, count = 5, maxIterations = 12) {
    const { data } = imageData;
    const pixels = [];
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
    if (pixels.length === 0) return [];

    const k = Math.min(count, pixels.length);
    const centroids = [];
    const used = new Set();
    while (centroids.length < k && used.size < pixels.length) {
        const index = Math.floor(Math.random() * pixels.length);
        if (!used.has(index)) {
            used.add(index);
            centroids.push([...pixels[index]]);
        }
    }

    const assignments = new Array(pixels.length);
    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
        for (let i = 0; i < pixels.length; i += 1) {
            let minDistance = Infinity;
            let cluster = 0;
            for (let j = 0; j < centroids.length; j += 1) {
                const distance = colorDistance(pixels[i], centroids[j]);
                if (distance < minDistance) {
                    minDistance = distance;
                    cluster = j;
                }
            }
            assignments[i] = cluster;
        }

        const sums = centroids.map(() => [0, 0, 0, 0]);
        for (let i = 0; i < pixels.length; i += 1) {
            const cluster = assignments[i];
            sums[cluster][0] += pixels[i][0];
            sums[cluster][1] += pixels[i][1];
            sums[cluster][2] += pixels[i][2];
            sums[cluster][3] += 1;
        }

        for (let j = 0; j < centroids.length; j += 1) {
            if (sums[j][3] > 0) {
                centroids[j] = [
                    Math.round(sums[j][0] / sums[j][3]),
                    Math.round(sums[j][1] / sums[j][3]),
                    Math.round(sums[j][2] / sums[j][3]),
                ];
            }
        }
    }

    const freq = {};
    for (let i = 0; i < pixels.length; i += 1) {
        const cluster = assignments[i];
        freq[cluster] = (freq[cluster] || 0) + 1;
    }

    return centroids
        .map((color, index) => ({
            r: color[0],
            g: color[1],
            b: color[2],
            hex: rgbToHex(color[0], color[1], color[2]),
            rgb: rgbToCss(color[0], color[1], color[2]),
            count: freq[index] || 0,
        }))
        .filter((color) => color.count > 0)
        .sort((a, b) => b.count - a.count);
}

export function normalizeImageDataUri(input) {
    const trimmed = input.trim();
    if (/^data:image\/[a-z+.-]+;base64,/i.test(trimmed)) return trimmed;
    const compact = trimmed.replace(/\s/g, "");
    if (/^[A-Za-z0-9+/=]+$/.test(compact)) {
        return `data:image/png;base64,${compact}`;
    }
    return null;
}

export function formatBase64Output(dataUri, format) {
    if (format === "html") {
        return `<img src="${dataUri}" alt="Image" />`;
    }
    if (format === "css") {
        return `background-image: url("${dataUri}");`;
    }
    return dataUri;
}

export function drawImageToCanvas(image, mimeType = "image/png", quality) {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (mimeType === "image/jpeg") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(image, 0, 0);
    return { canvas, mimeType, quality };
}

export async function stripExifFromImage(image, mimeType = "image/jpeg", quality = 0.92) {
    const { canvas } = drawImageToCanvas(image, mimeType);
    const blob = await canvasToBlob(canvas, mimeType, quality);
    return blob;
}

export function drawRoundedIcon(
    ctx,
    image,
    size,
    { radiusPercent = 0, backgroundColor = "#FFFFFF", withBackground = true } = {},
) {
    ctx.clearRect(0, 0, size, size);
    if (withBackground) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, size, size);
    }
    ctx.save();
    const radius = (radiusPercent / 100) * (size / 2);
    if (radius > 0 && typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(0, 0, size, size, radius);
        ctx.clip();
    }
    ctx.drawImage(image, 0, 0, size, size);
    ctx.restore();
}

export function paletteToJson(colors) {
    return JSON.stringify(
        colors.map(({ hex, rgb, r, g, b, count }) => ({
            hex,
            rgb,
            r,
            g,
            b,
            weight: count,
        })),
        null,
        2,
    );
}

export function paletteToCssVariables(colors) {
    return colors
        .map(
            (color, index) =>
                `  --palette-${index + 1}: ${color.hex}; /* ${color.rgb} */`,
        )
        .join("\n");
}

export async function renderPaletteCard(colors) {
    const swatchWidth = 120;
    const swatchHeight = 80;
    const padding = 16;
    const width = colors.length * swatchWidth + padding * 2;
    const height = swatchHeight + padding * 2 + 24;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);
    colors.forEach((color, index) => {
        const x = padding + index * swatchWidth;
        ctx.fillStyle = color.hex;
        ctx.fillRect(x, padding, swatchWidth - 8, swatchHeight);
        ctx.fillStyle = "#f8fafc";
        ctx.font = "12px IBM Plex Sans, sans-serif";
        ctx.fillText(color.hex, x + 6, padding + swatchHeight + 18);
    });
    return canvasToBlob(canvas, "image/png");
}

export const COMPRESS_MIMES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
export const COMPRESS_EXT = /\.(png|jpe?g|webp)$/i;
export const COMPRESS_ACCEPT = "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp";

export function validateCompressImage(file, maxBytes = 30 * MB) {
    return validateFile(file, {
        maxBytes,
        extensions: [COMPRESS_EXT],
        mimes: COMPRESS_MIMES,
        sizeMessage:
            "File exceeds 30 MB limit. Please choose a smaller image to preserve browser memory.",
        typeMessage: "Unsupported file type. Please upload JPG, PNG, or WEBP.",
    });
}

export function getMegapixels(width, height) {
    return (width * height) / 1_000_000;
}

export function megapixelWarning(width, height, threshold = 25) {
    const mp = getMegapixels(width, height);
    if (mp <= threshold) return null;
    return `This image is ${mp.toFixed(1)} megapixels (> ${threshold} MP). Processing may be slow on some devices.`;
}

export function inferFormatFromFile(file) {
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".png")) return "png";
    if (lower.endsWith(".webp")) return "webp";
    return "jpg";
}

export function resolveOutputFormat(file, formatPref, useWebp = false) {
    if (useWebp || formatPref === "webp") return { mime: "image/webp", ext: "webp" };
    if (formatPref === "jpg") return { mime: "image/jpeg", ext: "jpg" };
    if (formatPref === "png") return { mime: "image/png", ext: "png" };
    const inferred = inferFormatFromFile(file);
    if (inferred === "png") return { mime: "image/png", ext: "png" };
    if (inferred === "webp") return { mime: "image/webp", ext: "webp" };
    return { mime: "image/jpeg", ext: "jpg" };
}

export function scaleToMaxWidth(width, height, maxWidth) {
    if (!maxWidth || width <= maxWidth) return { width, height };
    const ratio = maxWidth / width;
    return {
        width: Math.round(width * ratio),
        height: Math.round(height * ratio),
    };
}

export function scaleByPercent(width, height, percent) {
    const ratio = clamp(percent, 1, 100) / 100;
    return {
        width: Math.max(1, Math.round(width * ratio)),
        height: Math.max(1, Math.round(height * ratio)),
    };
}

export function createCanvas(width, height, maxPixels = MAX_CANVAS_PIXELS) {
    const { width: w, height: h } = clampDimensions(width, height, maxPixels);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not supported in this browser.");
    return { canvas, ctx, width: w, height: h };
}

export function drawImageOnCanvas(image, width, height, { background = null } = {}) {
    const { canvas, ctx } = createCanvas(width, height);
    if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(image, 0, 0, width, height);
    return canvas;
}

export async function compressCanvas(canvas, mime, qualityPercent = 80) {
    const quality =
        mime === "image/png"
            ? undefined
            : clamp(qualityPercent / 100, 0.01, 1);
    return canvasToBlob(canvas, mime, quality);
}

export async function compressImage(image, file, options = {}) {
    const {
        quality = 80,
        useWebp = false,
        format = "auto",
        maxWidth = null,
        scalePercent = null,
    } = options;

    let width = image.naturalWidth;
    let height = image.naturalHeight;

    if (maxWidth) {
        ({ width, height } = scaleToMaxWidth(width, height, maxWidth));
    } else if (scalePercent != null) {
        ({ width, height } = scaleByPercent(width, height, scalePercent));
    }

    const { mime } = resolveOutputFormat(file, format, useWebp);
    const background = mime === "image/jpeg" ? "#FFFFFF" : null;
    const canvas = drawImageOnCanvas(image, width, height, { background });
    const blob = await compressCanvas(canvas, mime, quality);
    const { ext } = resolveOutputFormat(file, format, useWebp);
    return { blob, width, height, mime, ext };
}

export async function blobAtQuality(image, file, quality, options = {}) {
    const result = await compressImage(image, file, { ...options, quality });
    return result.blob;
}

export async function binarySearchTargetSize(image, file, targetBytes, options = {}) {
    const {
        format = "auto",
        allowScaleDown = true,
        maxQualityIterations = 8,
        maxScalePasses = 4,
        onProgress,
    } = options;

    let scale = 1;
    let best = null;
    let qualityIterations = 0;
    let scalePass = 0;

    const tryCompress = async (quality, currentScale) => {
        const scalePercent = Math.round(currentScale * 100);
        const result = await compressImage(image, file, {
            quality,
            format,
            scalePercent: currentScale < 1 ? scalePercent : null,
        });
        return { ...result, quality, scale: currentScale };
    };

    while (scalePass <= maxScalePasses) {
        let low = 1;
        let high = 100;
        let localBest = null;

        while (low <= high && qualityIterations < maxQualityIterations) {
            qualityIterations += 1;
            const mid = Math.floor((low + high) / 2);
            onProgress?.({
                qualityIterations,
                scalePass,
                maxQualityIterations,
                maxScalePasses,
            });

            const attempt = await tryCompress(mid, scale);
            await waitFrame();

            if (attempt.blob.size <= targetBytes) {
                localBest = attempt;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        if (localBest) {
            best = localBest;
            break;
        }

        if (!allowScaleDown || scalePass >= maxScalePasses) break;
        scale *= 0.85;
        scalePass += 1;
    }

    if (!best) {
        best = await tryCompress(10, scale);
    }

    return best;
}

export function applyNamingPattern(originalName, pattern, ext) {
    const base = originalName.replace(/\.[^.]+$/, "") || "image";
    return (pattern || "{name}-min.{ext}")
        .replace(/\{name\}/g, base)
        .replace(/\{ext\}/g, ext);
}

export async function loadJSZip() {
    const { default: JSZip } = await import("jszip");
    return JSZip;
}

export async function downloadZip(files, zipName = "images.zip") {
    const JSZip = await loadJSZip();
    const zip = new JSZip();
    for (const { name, blob } of files) {
        zip.file(name, blob);
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });
    triggerDownload(zipBlob, zipName);
}

export function parseTargetBytes(value, unit) {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return null;
    return unit === "MB" ? num * MB : num * 1024;
}

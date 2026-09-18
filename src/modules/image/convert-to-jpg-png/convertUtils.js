const ACCEPTED_MIME = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/bmp",
    "image/gif",
]);

const ACCEPTED_EXT = /\.(png|jpe?g|webp|bmp|gif)$/i;

export const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024;

export const ACCEPTED_FILE_TYPES =
    "image/png,image/jpeg,image/webp,image/bmp,image/gif,.png,.jpg,.jpeg,.webp,.bmp,.gif";

export const PROCESS_STAGES = {
    IDLE: "idle",
    READING: "reading",
    RENDERING: "rendering",
    COMPRESSING: "compressing",
    READY: "ready",
};

export const STAGE_LABELS = {
    [PROCESS_STAGES.READING]: "Reading file...",
    [PROCESS_STAGES.RENDERING]: "Rendering canvas...",
    [PROCESS_STAGES.COMPRESSING]: "Compressing output...",
    [PROCESS_STAGES.READY]: "Ready for download",
};

export function isAcceptedImageFile(file) {
    if (!file) return false;

    const hasValidExtension = ACCEPTED_EXT.test(file.name);
    if (!hasValidExtension) return false;

    if (file.type && file.type !== "") {
        return ACCEPTED_MIME.has(file.type);
    }

    return true;
}

export function validateImageFile(file) {
    if (!file) {
        return { ok: false, error: "No file selected.", code: "EMPTY" };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        return {
            ok: false,
            error:
                "File exceeds 30 MB limit. Please choose a smaller image to preserve browser memory.",
            code: "SIZE",
        };
    }

    if (!isAcceptedImageFile(file)) {
        return {
            ok: false,
            error:
                "Unsupported file type. Please upload PNG, JPG, JPEG, WEBP, BMP, or GIF.",
            code: "TYPE",
        };
    }

    return { ok: true };
}

export function formatBytes(bytes) {
    if (bytes == null || Number.isNaN(bytes)) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatSavingsPercent(originalSize, convertedSize) {
    if (!originalSize || !convertedSize) return null;
    const delta = ((originalSize - convertedSize) / originalSize) * 100;
    if (delta >= 0.05) return `${delta.toFixed(1)}% saved`;
    if (delta <= -0.05) return `${Math.abs(delta).toFixed(1)}% larger`;
    return "Same size";
}

function readFileWithProgress(file, onProgress) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onprogress = (event) => {
            if (!event.lengthComputable) return;
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress?.(percent);
        };

        reader.onload = () => {
            onProgress?.(100);
            resolve(reader.result);
        };

        reader.onerror = () => {
            reject(new Error("Could not read this image file."));
        };

        reader.onabort = () => {
            reject(new Error("File read was cancelled."));
        };

        reader.readAsArrayBuffer(file);
    });
}

function loadImageFromObjectUrl(objectUrl) {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => {
            resolve({
                image,
                objectUrl,
                width: image.naturalWidth,
                height: image.naturalHeight,
            });
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Could not decode this image file."));
        };

        image.src = objectUrl;
    });
}

export async function loadImageFromFileWithProgress(file, onProgress) {
    const buffer = await readFileWithProgress(file, onProgress);
    const mimeType =
        file.type && ACCEPTED_MIME.has(file.type) ? file.type : "application/octet-stream";
    const blob = new Blob([buffer], { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);
    return loadImageFromObjectUrl(objectUrl);
}

export function normalizeHexColor(color, fallback = "#FFFFFF") {
    if (typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)) {
        return color;
    }
    return fallback;
}

function waitForNextFrame() {
    return new Promise((resolve) => {
        requestAnimationFrame(() => resolve());
    });
}

export async function convertImageOnCanvas(
    image,
    targetFormat,
    qualityPercent,
    backgroundColor,
    { onStage } = {},
) {
    onStage?.(PROCESS_STAGES.RENDERING);
    await waitForNextFrame();

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Canvas is not supported in this browser.");
    }

    if (targetFormat === "jpg") {
        ctx.fillStyle = normalizeHexColor(backgroundColor);
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(image, 0, 0);

    onStage?.(PROCESS_STAGES.COMPRESSING);
    await waitForNextFrame();

    const mimeType = targetFormat === "jpg" ? "image/jpeg" : "image/png";
    const quality =
        targetFormat === "jpg" ? Math.min(1, Math.max(0.01, qualityPercent / 100)) : undefined;

    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
            (result) => {
                if (result) {
                    resolve(result);
                    return;
                }
                reject(new Error("Conversion failed. Try a different format or quality."));
            },
            mimeType,
            quality,
        );
    });

    onStage?.(PROCESS_STAGES.READY);
    return blob;
}

export function buildDownloadName(originalName, targetFormat) {
    const base = originalName.replace(/\.[^.]+$/, "") || "converted-image";
    const ext = targetFormat === "jpg" ? "jpg" : "png";
    return `${base}.${ext}`;
}

export function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

export async function copyImageBlobToClipboard(blob) {
    if (!navigator.clipboard?.write) {
        throw new Error("Clipboard access is not supported in this browser.");
    }

    if (typeof ClipboardItem === "undefined") {
        throw new Error("Clipboard images are not supported in this browser.");
    }

    try {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch {
        throw new Error("Could not copy to clipboard. Try downloading instead.");
    }
}

export function mapStageToProgress(stage, readProgress = 0) {
    switch (stage) {
        case PROCESS_STAGES.READING:
            return Math.min(100, Math.max(0, Math.round(readProgress * 0.35)));
        case PROCESS_STAGES.RENDERING:
            return 55;
        case PROCESS_STAGES.COMPRESSING:
            return 82;
        case PROCESS_STAGES.READY:
            return 100;
        default:
            return 0;
    }
}

export function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."));
        reader.readAsArrayBuffer(file);
    });
}

export function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."));
        reader.readAsText(file);
    });
}

export function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."));
        reader.readAsDataURL(file);
    });
}

export function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function getBaseName(filename) {
    const lastDot = filename.lastIndexOf(".");
    return lastDot > 0 ? filename.slice(0, lastDot) : filename;
}

export function replaceExtension(filename, extension) {
    const base = getBaseName(filename);
    const normalized = extension.startsWith(".") ? extension : `.${extension}`;
    return `${base}${normalized}`;
}

export function acceptFiles(event, onFiles) {
    const files = Array.from(event.target.files ?? []);
    if (files.length) onFiles(files);
    event.target.value = "";
}

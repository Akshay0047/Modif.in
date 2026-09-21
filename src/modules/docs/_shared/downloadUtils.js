export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

export function downloadBytes(bytes, filename, mimeType = "application/octet-stream") {
    const copy = bytes instanceof Uint8Array
        ? bytes.slice()
        : new Uint8Array(bytes instanceof ArrayBuffer ? bytes.slice(0) : bytes);
    const blob = new Blob([copy], { type: mimeType });
    downloadBlob(blob, filename);
}

export async function readFileAsArrayBuffer(file) {
    return file.arrayBuffer();
}

export async function readFileAsText(file) {
    return file.text();
}

export function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getBaseName(filename) {
    const dot = filename.lastIndexOf(".");
    return dot > 0 ? filename.slice(0, dot) : filename;
}

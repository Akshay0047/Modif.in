export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

export function downloadBytes(bytes, filename, mimeType) {
    const blob = new Blob([bytes], { type: mimeType });
    downloadBlob(blob, filename);
}

export function downloadText(text, filename, mimeType = "text/plain") {
    downloadBlob(new Blob([text], { type: mimeType }), filename);
}

export async function canvasToBlob(canvas, mimeType = "image/png", quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Failed to encode canvas."));
            },
            mimeType,
            quality,
        );
    });
}

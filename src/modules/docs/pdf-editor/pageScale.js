export function pageScale(pageSize, pixelSize) {
    const width = Number(pixelSize?.width);
    const height = Number(pixelSize?.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return null;
    }
    return {
        x: pageSize.width / width,
        y: pageSize.height / height,
    };
}

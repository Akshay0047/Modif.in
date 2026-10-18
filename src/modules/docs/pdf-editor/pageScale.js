// Convert a y-up coordinate system measured in preview pixels into PDF user
// coordinates. The viewport already includes page rotation, CropBox and UserUnit.
export function pageGeometry(viewport, pixelSize) {
    const width = Number(pixelSize?.width);
    const height = Number(pixelSize?.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return null;
    }
    const transform = viewport?.transform;
    if (!Array.isArray(transform) || transform.length !== 6 || !transform.every(Number.isFinite)) {
        return null;
    }
    const [a, b, c, d, e, f] = transform;
    const determinant = a * d - b * c;
    if (determinant === 0 || !Number.isFinite(determinant)) return null;

    // inverse(viewport) * [1, 0, 0, -1, 0, canvas.height]. Use the actual
    // canvas height because renderPageToCanvas rounds viewport dimensions up.
    const matrix = [
        d / determinant,
        -b / determinant,
        c / determinant,
        -a / determinant,
        (c * (f - height) - d * e) / determinant,
        (a * (height - f) + b * e) / determinant,
    ];
    if (!matrix.every(Number.isFinite)) return null;
    return {
        width,
        height,
        transform: matrix,
    };
}

/** Map a rectangle drawn on the preview canvas into PDF page space. */
export function canvasRectToPdfRect(rect, canvasSize, pageSize) {
    const canvasWidth = canvasSize.width || 1;
    const canvasHeight = canvasSize.height || 1;
    const scaleX = pageSize.width / canvasWidth;
    const scaleY = pageSize.height / canvasHeight;
    const width = rect.w * scaleX;
    const height = rect.h * scaleY;
    return {
        x: rect.x * scaleX,
        y: pageSize.height - rect.y * scaleY - height,
        width,
        height,
    };
}

export function scaleCanvasRect(rect, fromSize, toSize) {
    const scaleX = toSize.width / (fromSize.width || 1);
    const scaleY = toSize.height / (fromSize.height || 1);
    return {
        x: rect.x * scaleX,
        y: rect.y * scaleY,
        w: rect.w * scaleX,
        h: rect.h * scaleY,
    };
}

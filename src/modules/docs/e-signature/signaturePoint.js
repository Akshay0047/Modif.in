export function signaturePoint(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width || canvas.width || 1;
    const displayHeight = rect.height || canvas.height || 1;
    return {
        x: ((event.clientX - rect.left) * canvas.width) / displayWidth,
        y: ((event.clientY - rect.top) * canvas.height) / displayHeight,
    };
}

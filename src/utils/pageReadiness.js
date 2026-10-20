export function markPageReady(pathname) {
    document.documentElement.dataset.pageReady = pathname;
}

export function markSceneReady(canvas) {
    if (canvas) canvas.dataset.sceneReady = "true";
}

export function markSceneFailed(scene) {
    if (scene === "home" || scene === "module") document.documentElement.dataset[`${scene}SceneFailed`] = "true";
}

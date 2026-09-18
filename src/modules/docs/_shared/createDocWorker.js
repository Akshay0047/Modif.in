export function createDocWorker() {
    return new Worker(new URL("./workers/docWorker.js", import.meta.url), {
        type: "module",
    });
}

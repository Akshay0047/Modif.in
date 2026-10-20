export function workerTaskAborted() {
    const error = new Error("Document processing was cancelled.");
    error.name = "AbortError";
    return error;
}

export function createWorkerTaskRunner(createWorker, {
    timeoutMs = 180000,
    onRunning = () => {},
    onProgress = () => {},
    onError = () => {},
} = {}) {
    let worker = null;
    let disposed = false;
    let startupError = "";
    const pending = new Map();

    const stopWorker = () => {
        if (!worker) return;
        worker.removeEventListener("message", handleMessage);
        worker.removeEventListener("error", handleError);
        worker.terminate();
        worker = null;
    };

    const rejectPending = (error) => {
        for (const task of pending.values()) {
            clearTimeout(task.timer);
            task.reject(error);
        }
        pending.clear();
    };

    const fail = (error) => {
        if (disposed) return;
        startupError = error.message;
        stopWorker();
        rejectPending(error);
        onError(error.message);
        onRunning(false);
    };

    function handleError(event) {
        fail(new Error(event?.message || "Document worker failed to start"));
    }

    function handleMessage(event) {
        if (disposed) return;
        const data = event.data ?? {};
        const id = data.requestId ?? (pending.size === 1 ? pending.keys().next().value : undefined);
        const task = pending.get(id);
        if (!task) return;
        if (data.type === "progress") {
            onProgress(data.progress ?? 0);
            return;
        }
        if (data.type !== "done" && data.type !== "error") return;
        if (data.type === "error" || data.result == null) {
            fail(new Error(data.type === "error" ? data.error ?? "Processing failed" : "Worker returned no result"));
            return;
        }
        clearTimeout(task.timer);
        pending.delete(id);
        onRunning(pending.size > 0);
        task.resolve(data.result);
    }

    const spawnWorker = () => {
        try {
            worker = createWorker();
            worker.addEventListener("message", handleMessage);
            worker.addEventListener("error", handleError);
            startupError = "";
        } catch (error) {
            fail(error instanceof Error ? error : new Error("Document worker failed to start"));
        }
    };

    // An idle workspace must not download or initialize document engines.
    return {
        run(payload) {
            if (disposed) return Promise.reject(workerTaskAborted());
            if (!worker) spawnWorker();
            if (!worker) return Promise.reject(new Error(startupError || "Worker not available"));

            return new Promise((resolve, reject) => {
                const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
                const timer = setTimeout(() => {
                    fail(new Error("Document processing timed out. Try again."));
                }, timeoutMs);
                pending.set(requestId, { resolve, reject, timer });
                onRunning(true);
                onProgress(0);
                onError("");
                try {
                    worker.postMessage({ ...payload, requestId });
                } catch (error) {
                    fail(error instanceof Error ? error : new Error("Worker not available"));
                }
            });
        },
        dispose() {
            disposed = true;
            stopWorker();
            rejectPending(workerTaskAborted());
        },
    };
}

import { useCallback, useEffect, useRef, useState } from "react";

export function useWorkerTask(workerUrl) {
    const workerRef = useRef(null);
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");

    useEffect(() => {
        workerRef.current = new Worker(workerUrl, { type: "module" });
        return () => {
            workerRef.current?.terminate();
            workerRef.current = null;
        };
    }, [workerUrl]);

    const run = useCallback(
        (payload) =>
            new Promise((resolve, reject) => {
                const worker = workerRef.current;
                if (!worker) {
                    reject(new Error("Worker not available"));
                    return;
                }

                const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
                setRunning(true);
                setProgress(0);
                setError("");

                const handleMessage = (event) => {
                    const data = event.data ?? {};
                    if (data.requestId != null && data.requestId !== requestId) {
                        return;
                    }

                    if (data.type === "progress") {
                        setProgress(data.progress ?? 0);
                        return;
                    }

                    if (data.type !== "done" && data.type !== "error") {
                        return;
                    }

                    worker.removeEventListener("message", handleMessage);
                    worker.removeEventListener("error", handleError);
                    setRunning(false);

                    if (data.type === "error") {
                        const message = data.error ?? "Processing failed";
                        setError(message);
                        reject(new Error(message));
                        return;
                    }

                    if (data.result === undefined || data.result === null) {
                        const message = "Worker returned no result";
                        setError(message);
                        reject(new Error(message));
                        return;
                    }

                    resolve(data.result);
                };

                const handleError = (event) => {
                    worker.removeEventListener("message", handleMessage);
                    worker.removeEventListener("error", handleError);
                    setRunning(false);
                    setError(event.message ?? "Worker error");
                    reject(event);
                };

                worker.addEventListener("message", handleMessage);
                worker.addEventListener("error", handleError);
                worker.postMessage({ ...payload, requestId });
            }),
        [],
    );

    return { run, running, progress, error, setError, setProgress };
}

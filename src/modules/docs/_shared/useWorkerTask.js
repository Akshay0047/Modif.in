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

                setRunning(true);
                setProgress(0);
                setError("");

                const handleMessage = (event) => {
                    const { type, result, error: workerError, progress: pct } = event.data ?? {};
                    if (type === "progress") {
                        setProgress(pct ?? 0);
                        return;
                    }
                    worker.removeEventListener("message", handleMessage);
                    worker.removeEventListener("error", handleError);
                    setRunning(false);
                    if (type === "error") {
                        setError(workerError ?? "Processing failed");
                        reject(new Error(workerError ?? "Processing failed"));
                        return;
                    }
                    if (type === "done" || result !== undefined) {
                        resolve(result);
                        return;
                    }
                    reject(new Error("Worker returned no result"));
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
                worker.postMessage(payload);
            }),
        [],
    );

    return { run, running, progress, error, setError };
}

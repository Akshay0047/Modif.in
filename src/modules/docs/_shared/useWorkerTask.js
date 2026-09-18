import { useCallback, useEffect, useRef, useState } from "react";

export function useWorkerTask(workerFactory) {
    const workerRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        return () => {
            workerRef.current?.terminate();
            workerRef.current = null;
        };
    }, []);

    const runTask = useCallback(
        async (type, payload, transferables = []) => {
            setLoading(true);
            setProgress(0);
            setStatus("");
            setError("");

            if (!workerRef.current) {
                workerRef.current = workerFactory();
            }

            const worker = workerRef.current;

            return new Promise((resolve, reject) => {
                const handleMessage = (event) => {
                    const message = event.data;
                    if (message.type === "progress") {
                        setProgress(message.progress ?? 0);
                        if (message.status) setStatus(message.status);
                        return;
                    }
                    if (message.type === "result") {
                        worker.removeEventListener("message", handleMessage);
                        worker.removeEventListener("error", handleError);
                        setLoading(false);
                        resolve(message.result);
                        return;
                    }
                    if (message.type === "error") {
                        worker.removeEventListener("message", handleMessage);
                        worker.removeEventListener("error", handleError);
                        setLoading(false);
                        setError(message.error);
                        reject(new Error(message.error));
                    }
                };

                const handleError = (event) => {
                    worker.removeEventListener("message", handleMessage);
                    worker.removeEventListener("error", handleError);
                    setLoading(false);
                    const message = event.message || "Worker failed.";
                    setError(message);
                    reject(new Error(message));
                };

                worker.addEventListener("message", handleMessage);
                worker.addEventListener("error", handleError);
                worker.postMessage({ type, payload }, transferables);
            });
        },
        [workerFactory],
    );

    return { runTask, loading, progress, status, error, setError };
}

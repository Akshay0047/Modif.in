import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_TIMEOUT_MS = 180000;

function workerErrorMessage(event) {
    return event?.message || "Document worker failed to start";
}

export function useWorkerTask(createWorker, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    const workerRef = useRef(null);
    const createWorkerRef = useRef(createWorker);
    const startupErrorRef = useRef("");
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");

    createWorkerRef.current = createWorker;

    const spawnWorker = useCallback(() => {
        workerRef.current?.terminate();
        workerRef.current = null;
        startupErrorRef.current = "";

        try {
            const worker = createWorkerRef.current();
            worker.addEventListener("error", (event) => {
                startupErrorRef.current = workerErrorMessage(event);
                setError(startupErrorRef.current);
                setRunning(false);
            });
            workerRef.current = worker;
            return worker;
        } catch (spawnError) {
            startupErrorRef.current = spawnError?.message || "Document worker failed to start";
            setError(startupErrorRef.current);
            return null;
        }
    }, []);

    useEffect(() => {
        spawnWorker();
        return () => {
            workerRef.current?.terminate();
            workerRef.current = null;
        };
    }, [spawnWorker]);

    const run = useCallback(
        (payload) =>
            new Promise((resolve, reject) => {
                if (!workerRef.current || startupErrorRef.current) {
                    spawnWorker();
                }

                const worker = workerRef.current;
                if (!worker) {
                    const message = startupErrorRef.current || "Worker not available";
                    setError(message);
                    reject(new Error(message));
                    return;
                }

                let settled = false;
                const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
                setRunning(true);
                setProgress(0);
                setError("");

                const finish = (callback) => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    worker.removeEventListener("message", handleMessage);
                    worker.removeEventListener("error", handleError);
                    setRunning(false);
                    callback();
                };

                const fail = (message, cause) => {
                    startupErrorRef.current = message;
                    worker.terminate();
                    if (workerRef.current === worker) workerRef.current = null;
                    setError(message);
                    finish(() => reject(cause instanceof Error ? cause : new Error(message)));
                };

                const handleMessage = (event) => {
                    const data = event.data ?? {};
                    if (data.requestId != null && data.requestId !== requestId) return;

                    if (data.type === "progress") {
                        setProgress(data.progress ?? 0);
                        return;
                    }

                    if (data.type !== "done" && data.type !== "error") return;

                    if (data.type === "error") {
                        fail(data.error ?? "Processing failed");
                        return;
                    }

                    if (data.result === undefined || data.result === null) {
                        fail("Worker returned no result");
                        return;
                    }

                    startupErrorRef.current = "";
                    finish(() => resolve(data.result));
                };

                const handleError = (event) => {
                    fail(workerErrorMessage(event));
                };

                const timer = setTimeout(() => {
                    fail("Document processing timed out. Try again.");
                }, timeoutMs);

                worker.addEventListener("message", handleMessage);
                worker.addEventListener("error", handleError);

                try {
                    worker.postMessage({ ...payload, requestId });
                } catch (postError) {
                    fail(postError?.message || "Worker not available", postError);
                }
            }),
        [spawnWorker, timeoutMs],
    );

    return { run, running, progress, error, setError, setProgress };
}

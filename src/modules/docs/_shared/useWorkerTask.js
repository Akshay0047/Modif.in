import { useCallback, useEffect, useRef, useState } from "react";
import { createWorkerTaskRunner, workerTaskAborted } from "./workerTaskRunner";

export function useWorkerTask(createWorker, { timeoutMs = 180000 } = {}) {
    const runnerRef = useRef(null);
    const createWorkerRef = useRef(createWorker);
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");

    useEffect(() => {
        createWorkerRef.current = createWorker;
    }, [createWorker]);

    useEffect(() => {
        const runner = createWorkerTaskRunner(() => createWorkerRef.current(), {
            timeoutMs,
            onRunning: setRunning,
            onProgress: setProgress,
            onError: setError,
        });
        runnerRef.current = runner;
        return () => {
            runnerRef.current = null;
            runner.dispose();
        };
    }, [timeoutMs]);

    const run = useCallback((payload) => {
        if (!runnerRef.current) return Promise.reject(workerTaskAborted());
        return runnerRef.current.run(payload);
    }, []);

    return { run, running, progress, error, setError, setProgress };
}

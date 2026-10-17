import { useEffect, useId, useRef, useState } from "react";
import "./CopyButton.css";

function CopyButton({ text, label = "Copy to Clipboard", disabled = false }) {
    const [result, setResult] = useState({ text: null, status: "idle" });
    const manualRef = useRef(null);
    const timerRef = useRef(null);
    const requestRef = useRef(0);
    const statusId = useId();
    const status = result.text === text ? result.status : "idle";

    useEffect(() => () => {
        window.clearTimeout(timerRef.current);
        requestRef.current += 1;
    }, []);

    const handleCopy = async () => {
        if (!text || disabled || status === "pending") return;
        const request = ++requestRef.current;
        window.clearTimeout(timerRef.current);
        setResult({ text, status: "pending" });

        try {
            await navigator.clipboard.writeText(text);
            if (request !== requestRef.current) return;
            setResult({ text, status: "copied" });
            timerRef.current = window.setTimeout(() => {
                setResult({ text, status: "idle" });
            }, 2000);
        } catch {
            if (request === requestRef.current) setResult({ text, status: "failed" });
        }
    };

    return (
        <span className="copy-control">
        <button
            type="button"
            className="text-tool-button cursor-target"
            onClick={handleCopy}
            disabled={disabled || !text || status === "pending"}
            aria-describedby={statusId}
        >
            {status === "copied" ? "Copied!" : label}
        </button>
        <span id={statusId} className="copy-control__status" role="status">
            {status === "failed" ? "Copy failed. Select the text below and copy it manually." : status === "copied" ? "Copied to clipboard." : ""}
        </span>
        {status === "failed" ? (
            <span className="copy-control__manual">
                <label htmlFor={`${statusId}-manual`}>Text for manual copy</label>
                <textarea id={`${statusId}-manual`} ref={manualRef} value={text} readOnly />
                <button type="button" className="text-tool-button cursor-target" onClick={() => {
                    manualRef.current?.focus();
                    manualRef.current?.select();
                }}>Select text</button>
            </span>
        ) : null}
        </span>
    );
}

export default CopyButton;

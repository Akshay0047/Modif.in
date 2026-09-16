import { useState } from "react";

function CopyButton({ text, label = "Copy to Clipboard", disabled = false }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!text || disabled) return;

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <button
            type="button"
            className="text-tool-button cursor-target"
            onClick={handleCopy}
            disabled={disabled || !text}
        >
            {copied ? "Copied!" : label}
        </button>
    );
}

export default CopyButton;

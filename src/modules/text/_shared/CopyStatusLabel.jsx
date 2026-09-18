function CopyStatusLabel({ copied }) {
    return (
        <span
            className={`text-tool-copy-status${
                copied ? " text-tool-copy-status--copied" : ""
            }`}
            aria-live="polite"
        >
            {copied ? "Copied to clipboard!" : "Click to copy"}
        </span>
    );
}

export default CopyStatusLabel;

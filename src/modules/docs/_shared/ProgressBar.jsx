function ProgressBar({ value = 0, label = "" }) {
    const percent = Math.min(100, Math.max(0, Math.round(value)));
    const name = label || "Processing";

    return (
        <div>
            {label ? (
                <p className="doc-tool-status" role="status">
                    {label}
                </p>
            ) : null}
            <div
                className="doc-tool-progress"
                role="progressbar"
                aria-label={name}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-valuetext={`${percent}%`}
            >
                <div
                    className="doc-tool-progress__bar"
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}

export default ProgressBar;

function ProgressBar({ value = 0, label }) {
    const clamped = Math.max(0, Math.min(100, value));
    return (
        <div>
            {label ? <p className="doc-tool-status">{label}</p> : null}
            <div className="doc-tool-progress" aria-hidden="true">
                <div
                    className="doc-tool-progress__bar"
                    style={{ width: `${clamped}%` }}
                />
            </div>
        </div>
    );
}

export default ProgressBar;

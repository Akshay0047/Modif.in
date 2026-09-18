function ProgressBar({ value = 0, label = "" }) {
    const percent = Math.min(100, Math.max(0, value));

    return (
        <div>
            {label ? <p className="doc-tool-status">{label}</p> : null}
            <div className="doc-tool-progress" aria-hidden="true">
                <div
                    className="doc-tool-progress__bar"
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}

export default ProgressBar;

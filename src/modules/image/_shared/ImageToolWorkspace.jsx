import BackButton from "../../../components/BackButton";
import ImageToolShell from "./ImageToolShell";
import usePreventWindowDragDrop from "./usePreventWindowDragDrop";
import "./imageToolCommon.css";

const PRIVACY =
    "100% Client-Side: Your images are processed directly in your browser memory and never uploaded to any server.";

export function ImageProgressBar({ label, progress, visible = true }) {
    if (!visible) return null;
    return (
        <div className="img-tool__progress" aria-live="polite">
            <div className="img-tool__progress-header">
                <span className="img-tool__progress-stage">{label}</span>
                <span className="img-tool__progress-value">{progress}%</span>
            </div>
            <div
                className="img-tool__progress-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                aria-label={label}
            >
                <div className="img-tool__progress-fill" style={{ width: `${progress}%` }} />
            </div>
        </div>
    );
}

export function ImageToolWorkspace({
    title,
    privacy = PRIVACY,
    error,
    status,
    left,
    right,
    progress,
    progressLabel,
    showProgress = false,
}) {
    usePreventWindowDragDrop();

    return (
        <ImageToolShell>
            <BackButton />
            <div className="img-tool">
                <h1 className="img-tool__title">{title}</h1>
                <p className="img-tool__privacy" role="note">
                    {privacy}
                </p>
                {error ? (
                    <div className="img-tool__error-badge" role="alert">
                        {error}
                    </div>
                ) : null}
                <div className="img-tool__layout">
                    <section className="img-tool__panel img-tool__controls">{left}</section>
                    <section className="img-tool__panel img-tool__preview-col">
                        {right}
                        {showProgress ? (
                            <ImageProgressBar label={progressLabel} progress={progress} />
                        ) : null}
                        {status ? (
                            <p className="img-tool__status is-success" aria-live="polite">
                                {status}
                            </p>
                        ) : null}
                    </section>
                </div>
            </div>
        </ImageToolShell>
    );
}

export default ImageToolWorkspace;

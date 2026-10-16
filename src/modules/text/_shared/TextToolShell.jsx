import LocalSecurityDisclaimer from "./LocalSecurityDisclaimer";
import "./text-tool.css";

function TextToolShell({
    title,
    description,
    leading,
    privacySensitive = false,
    children,
}) {
    return (
        <section className="text-tool-page" aria-label={title}>
            {leading}
            <header className="text-tool-page__header">
                <h1 className="text-tool-page__title">{title}</h1>
                {description ? (
                    <p className="text-tool-page__description">{description}</p>
                ) : null}
            </header>
            {privacySensitive ? <LocalSecurityDisclaimer /> : null}
            {children}
        </section>
    );
}

export default TextToolShell;

import LocalSecurityDisclaimer from "./LocalSecurityDisclaimer";
import "./doc-tool.css";

function DocToolShell({
    title,
    description,
    leading,
    privacySensitive = true,
    children,
}) {
    return (
        <section className="doc-tool-page" aria-label={title}>
            {leading}
            <header className="doc-tool-page__header">
                <h1 className="doc-tool-page__title">{title}</h1>
                {description ? (
                    <p className="doc-tool-page__description">{description}</p>
                ) : null}
            </header>
            {privacySensitive ? <LocalSecurityDisclaimer /> : null}
            {children}
        </section>
    );
}

export default DocToolShell;

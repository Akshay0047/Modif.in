import { useEffect, useRef } from "react";
import LocalSecurityDisclaimer from "./LocalSecurityDisclaimer";
import "./doc-tool.css";

function markStatus(node) {
    if (node.getAttribute("role")) return;
    const isError = node.classList.contains("doc-tool-status--error");
    node.setAttribute("role", isError ? "alert" : "status");
}

function DocToolShell({
    title,
    description,
    leading,
    privacySensitive = true,
    children,
}) {
    const rootRef = useRef(null);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return undefined;

        const apply = () => {
            root.querySelectorAll(".doc-tool-status").forEach(markStatus);
        };

        apply();
        const observer = new MutationObserver(apply);
        observer.observe(root, { childList: true, subtree: true, characterData: true });
        return () => observer.disconnect();
    }, []);

    return (
        <section ref={rootRef} className="doc-tool-page" aria-label={title}>
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

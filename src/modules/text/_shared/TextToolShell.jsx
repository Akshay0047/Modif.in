import { useEffect } from "react";
import LocalSecurityDisclaimer from "./LocalSecurityDisclaimer";
import { insertTabAtCursor } from "./textInputUtils";
import "./text-tool.css";

function TextToolShell({
    title,
    description,
    leading,
    privacySensitive = false,
    children,
}) {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key !== "Tab" || event.shiftKey) return;
            insertTabAtCursor(event);
        };

        document.addEventListener("keydown", handleKeyDown, true);
        return () => document.removeEventListener("keydown", handleKeyDown, true);
    }, []);

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

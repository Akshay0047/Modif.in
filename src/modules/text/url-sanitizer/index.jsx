import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { safeExecute, sanitizeUrl } from "../_shared/webSecurityUtils";

function UrlSanitizer() {
    const [input, setInput] = useState(
        "https://www.linkedin.com/in/junaidahamed7777?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    );

    const output = useMemo(
        () => safeExecute("sanitize", () => sanitizeUrl(input)),
        [input],
    );

    return (
        <TextToolShell title="URL Sanitizer" description="Remove recognized tracking parameters while preserving functional query values, fragments, and paths." leading={<BackButton />}>
            <div className="text-tool-panel">
                <label className="text-tool-label" htmlFor="url-sanitizer-input">URL to clean</label>
                <textarea aria-invalid={Boolean(output.error)} aria-describedby={output.error ? "url-sanitizer-input-error" : undefined} id="url-sanitizer-input" className="text-tool-textarea" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-output-header"><h2 className="text-tool-section-title">Sanitized URL</h2><CopyButton text={output.ok ? output.value : ""} disabled={!output.ok} /></div>
                {output.error ? <p id="url-sanitizer-input-error" className="text-tool-empty" role="alert">{output.error}</p> : <textarea aria-label="Sanitized URL" className="text-tool-textarea" value={output.value} readOnly />}
            </div>
        </TextToolShell>
    );
}

export default UrlSanitizer;

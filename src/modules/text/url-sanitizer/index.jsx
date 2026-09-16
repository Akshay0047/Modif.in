import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { safeExecute, sanitizeUrl } from "../_shared/webSecurityUtils";

function UrlSanitizer() {
    const [input, setInput] = useState("https://example.com/path?utm_source=test&id=1#section");

    const output = useMemo(
        () => safeExecute("sanitize", () => sanitizeUrl(input)),
        [input],
    );

    return (
        <TextToolShell title="URL Sanitizer" description="Remove tracking parameters, normalize URLs, and clean query strings." leading={<BackButton />}>
            <div className="text-tool-panel">
                <textarea className="text-tool-textarea" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-output-header"><h2 className="text-tool-section-title">Sanitized URL</h2><CopyButton text={output.ok ? output.value : ""} disabled={!output.ok} /></div>
                {output.error ? <p className="text-tool-empty">{output.error}</p> : <textarea className="text-tool-textarea" value={output.value} readOnly />}
            </div>
        </TextToolShell>
    );
}

export default UrlSanitizer;

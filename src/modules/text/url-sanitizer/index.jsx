import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { safeExecute, sanitizeUrl } from "../_shared/webSecurityUtils";

function UrlSanitizer() {
    const [input, setInput] = useState(
        "https://events.heapheaphurray.com/?hhh-events%5BrefinementList%5D%5BeventType%5D%5B0%5D=hackathon&utm_source=newsletter&id=42",
    );

    const output = useMemo(
        () => safeExecute("sanitize", () => sanitizeUrl(input)),
        [input],
    );

    return (
        <TextToolShell title="URL Sanitizer" description="Strip tracking, analytics, and UI filter noise so only the meaningful URL remains." leading={<BackButton />}>
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

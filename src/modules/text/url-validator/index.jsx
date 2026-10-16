import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import TextToolShell from "../_shared/TextToolShell";
import { safeExecute, validateUrl } from "../_shared/webSecurityUtils";

function UrlValidator() {
    const [input, setInput] = useState("https://modif.in/text");

    const result = useMemo(
        () => safeExecute("validate", () => validateUrl(input)),
        [input],
    );

    return (
        <TextToolShell title="URL Validator" description="Check whether a URL has valid basic structure." leading={<BackButton />}>
            <div className="text-tool-panel">
                <label className="text-tool-label" htmlFor="url-validator-input">URL to validate</label>
                <input aria-invalid={Boolean(result.error)} aria-describedby="url-validation-status" id="url-validator-input" className="text-tool-input" value={input} onChange={(e) => setInput(e.target.value)} />
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-stat-grid">
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">Status</span>
                        <span className="text-tool-stat__value">
                            {result.error ? "Invalid" : "Valid"}
                        </span>
                    </div>
                </div>
                <p id="url-validation-status" className="text-tool-hint" style={{ marginTop: "0.75rem" }}>
                    {result.error || result.value.message}
                </p>
            </div>
        </TextToolShell>
    );
}

export default UrlValidator;

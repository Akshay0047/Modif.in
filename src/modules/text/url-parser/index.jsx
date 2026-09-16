import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { parseUrl, safeExecute } from "../_shared/webSecurityUtils";

function UrlParser() {
    const [input, setInput] = useState("https://example.com:8080/docs/page?q=modif#intro");

    const parsed = useMemo(
        () => safeExecute("parse", () => parseUrl(input)),
        [input],
    );

    const rows = parsed.ok
        ? [
              ["Protocol", parsed.value.protocol],
              ["Host", parsed.value.host],
              ["Port", parsed.value.port],
              ["Path", parsed.value.path],
              ["Query", parsed.value.query || "—"],
              ["Fragment", parsed.value.fragment || "—"],
          ]
        : [];

    return (
        <TextToolShell title="URL Parser" description="Break a URL into protocol, host, port, path, query, and fragment parts." leading={<BackButton />}>
            <div className="text-tool-panel">
                <textarea className="text-tool-textarea" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
            </div>
            <div className="text-tool-panel">
                {parsed.error ? (
                    <p className="text-tool-empty">{parsed.error}</p>
                ) : (
                    <div className="text-tool-info-grid">
                        {rows.map(([label, value]) => (
                            <div key={label} className="text-tool-info-row">
                                <span className="text-tool-info-row__label">{label}</span>
                                <span className="text-tool-info-row__value">{value}</span>
                            </div>
                        ))}
                    </div>
                )}
                {parsed.ok ? (
                    <div style={{ marginTop: "1rem" }}>
                        <CopyButton text={JSON.stringify(parsed.value, null, 2)} label="Copy parsed JSON" />
                    </div>
                ) : null}
            </div>
        </TextToolShell>
    );
}

export default UrlParser;

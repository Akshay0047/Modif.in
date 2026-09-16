import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { detectPii } from "../_shared/webSecurityUtils";

function PiiDetector() {
    const [text, setText] = useState(
        "Contact john@example.com or visit https://modif.in. Phone: (555) 123-4567 IP: 192.168.0.10",
    );

    const findings = useMemo(() => detectPii(text), [text]);

    return (
        <TextToolShell title="PII Detector" description="Find emails, URLs, phone numbers, and IP addresses in text." leading={<BackButton />}>
            <div className="text-tool-panel">
                <textarea className="text-tool-textarea" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Detected items</h2>
                    <CopyButton
                        text={findings.map((entry) => `${entry.type}: ${entry.value}`).join("\n")}
                        disabled={findings.length === 0}
                    />
                </div>
                {findings.length === 0 ? (
                    <p className="text-tool-empty">No PII patterns detected.</p>
                ) : (
                    <div className="text-tool-table-wrap">
                        <table className="text-tool-table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Value</th>
                                    <th>Index</th>
                                </tr>
                            </thead>
                            <tbody>
                                {findings.map((entry, index) => (
                                    <tr key={`${entry.type}-${entry.index}-${index}`}>
                                        <td>{entry.type}</td>
                                        <td>{entry.value}</td>
                                        <td>{entry.index}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </TextToolShell>
    );
}

export default PiiDetector;

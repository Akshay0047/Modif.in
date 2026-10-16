import { useEffect, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { generateHmac } from "../_shared/webSecurityUtils";

const ALGORITHMS = ["SHA-1", "SHA-256", "SHA-512"];

function HmacGenerator() {
    const [message, setMessage] = useState("");
    const [secret, setSecret] = useState("");
    const [algorithm, setAlgorithm] = useState("SHA-256");
    const [output, setOutput] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        if (!message || !secret) {
            setOutput("");
            setError("");
            return undefined;
        }

        generateHmac(message, secret, algorithm)
            .then((value) => {
                if (!cancelled) {
                    setOutput(value);
                    setError("");
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setOutput("");
                    setError(err instanceof Error ? err.message : String(err));
                }
            });

        return () => {
            cancelled = true;
        };
    }, [message, secret, algorithm]);

    return (
        <TextToolShell title="HMAC Generator" description="Generate HMAC signatures from a message and secret key." leading={<BackButton />} privacySensitive>
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    {ALGORITHMS.map((entry) => (
                        <button key={entry} type="button" className={`text-tool-button cursor-target${algorithm === entry ? " is-active" : ""}`} onClick={() => setAlgorithm(entry)}>{entry}</button>
                    ))}
                </div>
                <label className="text-tool-label" htmlFor="hmac-message">Message</label>
                <textarea aria-invalid={Boolean(error)} aria-describedby={error ? "hmac-message-error" : undefined} id="hmac-message" className="text-tool-textarea" value={message} onChange={(e) => setMessage(e.target.value)} spellCheck={false} />
                <label className="text-tool-label" htmlFor="hmac-secret">Secret key</label>
                <input aria-invalid={Boolean(error)} aria-describedby={error ? "hmac-message-error" : undefined} id="hmac-secret" className="text-tool-input" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} />
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-output-header"><h2 className="text-tool-section-title">HMAC output</h2><CopyButton text={output} disabled={!output} /></div>
                {error ? <p id="hmac-message-error" className="text-tool-empty" role="alert">{error}</p> : <textarea aria-label="HMAC signature" className="text-tool-textarea" value={output} readOnly />}
            </div>
        </TextToolShell>
    );
}

export default HmacGenerator;

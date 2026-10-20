import { useEffect, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { generateHash } from "../_shared/webSecurityUtils";

const ALGORITHMS = ["MD5", "SHA-1", "SHA-256", "SHA-512"];

function HashGenerator() {
    const [input, setInput] = useState("");
    const [algorithm, setAlgorithm] = useState("SHA-256");
    const [output, setOutput] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        generateHash(input, algorithm)
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
    }, [input, algorithm]);

    return (
        <TextToolShell title="Hash Generator" description="Generate MD5, SHA-1, SHA-256, and SHA-512 hashes from text." leading={<BackButton />} privacySensitive>
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    {ALGORITHMS.map((entry) => (
                        <button aria-pressed={algorithm === entry} key={entry} type="button" className={`text-tool-button cursor-target${algorithm === entry ? " is-active" : ""}`} onClick={() => setAlgorithm(entry)}>{entry}</button>
                    ))}
                </div>
                <label className="text-tool-label" htmlFor="hash-input">Text to hash</label>
                <textarea aria-invalid={Boolean(error)} aria-describedby={error ? "hash-input-error" : undefined} id="hash-input" className="text-tool-textarea" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-output-header"><h2 className="text-tool-section-title">Hash output</h2><CopyButton text={output} disabled={!output} /></div>
                {error ? <p id="hash-input-error" className="text-tool-empty" role="alert">{error}</p> : <textarea aria-label="Hash value" className="text-tool-textarea" value={output} readOnly />}
            </div>
        </TextToolShell>
    );
}

export default HashGenerator;

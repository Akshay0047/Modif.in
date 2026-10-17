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
                        <button key={entry} type="button" className={`text-tool-button cursor-target${algorithm === entry ? " is-active" : ""}`} onClick={() => setAlgorithm(entry)}>{entry}</button>
                    ))}
                </div>
                <textarea className="text-tool-textarea" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-output-header"><h2 className="text-tool-section-title">Hash output</h2><CopyButton text={output} disabled={!output} /></div>
                {error ? <p className="text-tool-empty">{error}</p> : <textarea className="text-tool-textarea" value={output} readOnly />}
            </div>
        </TextToolShell>
    );
}

export default HashGenerator;

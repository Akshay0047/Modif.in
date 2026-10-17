import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { calculateEntropy } from "../_shared/webSecurityUtils";

function EntropyCalculator() {
    const [input, setInput] = useState("");

    const result = useMemo(() => calculateEntropy(input), [input]);

    return (
        <TextToolShell title="Entropy Calculator" description="Estimate password entropy based on length and character set size." leading={<BackButton />} privacySensitive>
            <div className="text-tool-panel">
                <label className="text-tool-label" htmlFor="entropy-input">Text to analyze</label>
                <textarea id="entropy-input" className="text-tool-textarea" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter text or a password…" spellCheck={false} />
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-stat-grid">
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">Entropy (bits)</span>
                        <span className="text-tool-stat__value">{result.bits.toFixed(2)}</span>
                    </div>
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">Charset size</span>
                        <span className="text-tool-stat__value">{result.charsetSize}</span>
                    </div>
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">Length</span>
                        <span className="text-tool-stat__value">{input.length}</span>
                    </div>
                </div>
                <div style={{ marginTop: "1rem" }}>
                    <CopyButton text={`${result.bits.toFixed(2)} bits`} label="Copy entropy" disabled={!input} />
                </div>
            </div>
        </TextToolShell>
    );
}

export default EntropyCalculator;

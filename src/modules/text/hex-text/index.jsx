import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { hexToText, safeExecute, textToHex } from "../_shared/encodingUtils";

function HexText() {
    const [input, setInput] = useState("");
    const [mode, setMode] = useState("text-to-hex");

    const output = useMemo(
        () =>
            safeExecute("hex", () =>
                mode === "text-to-hex" ? textToHex(input) : hexToText(input),
            ),
        [input, mode],
    );

    return (
        <TextToolShell title="Hex ↔ Text" description="Convert text to UTF-8 hexadecimal bytes and decode UTF-8 bytes back to text. Enter pairs of hex digits, with optional spaces." leading={<BackButton />}>
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    <button type="button" className={`text-tool-button cursor-target${mode === "text-to-hex" ? " is-active" : ""}`} onClick={() => setMode("text-to-hex")}>Text → Hex</button>
                    <button type="button" className={`text-tool-button cursor-target${mode === "hex-to-text" ? " is-active" : ""}`} onClick={() => setMode("hex-to-text")}>Hex → Text</button>
                </div>
                <label className="text-tool-label" htmlFor="hex-text-input">{mode === "text-to-hex" ? "Text to encode" : "UTF-8 hexadecimal bytes"}</label>
                <textarea id="hex-text-input" aria-invalid={!output.ok} aria-describedby={output.error ? "hex-text-error" : undefined} className="text-tool-textarea" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
                {output.error && <p id="hex-text-error" className="text-tool-empty" role="alert">{output.error}</p>}
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-output-header"><h2 className="text-tool-section-title">Output</h2><CopyButton text={output.ok ? output.value : ""} disabled={!output.ok} /></div>
                <textarea aria-label="Output" className="text-tool-textarea" value={output.value} readOnly />
            </div>
        </TextToolShell>
    );
}

export default HexText;

import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { binaryToText, safeExecute, textToBinary } from "../_shared/encodingUtils";

function BinaryText() {
    const [input, setInput] = useState("");
    const [mode, setMode] = useState("text-to-binary");

    const output = useMemo(
        () =>
            safeExecute("binary", () =>
                mode === "text-to-binary" ? textToBinary(input) : binaryToText(input),
            ),
        [input, mode],
    );

    return (
        <TextToolShell title="Binary ↔ Text" description="Convert text to UTF-8 binary bytes and decode UTF-8 bytes back to text. Separate each 8-bit byte with a space." leading={<BackButton />}>
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    <button type="button" className={`text-tool-button cursor-target${mode === "text-to-binary" ? " is-active" : ""}`} onClick={() => setMode("text-to-binary")}>Text → Binary</button>
                    <button type="button" className={`text-tool-button cursor-target${mode === "binary-to-text" ? " is-active" : ""}`} onClick={() => setMode("binary-to-text")}>Binary → Text</button>
                </div>
                <textarea id="binary-text-input" aria-label="Input" aria-invalid={!output.ok} aria-describedby={output.error ? "binary-text-error" : undefined} className="text-tool-textarea" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
                {output.error && <p id="binary-text-error" className="text-tool-empty" role="alert">{output.error}</p>}
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-output-header"><h2 className="text-tool-section-title">Output</h2><CopyButton text={output.ok ? output.value : ""} disabled={!output.ok} /></div>
                <textarea aria-label="Output" className="text-tool-textarea" value={output.value} readOnly />
            </div>
        </TextToolShell>
    );
}

export default BinaryText;

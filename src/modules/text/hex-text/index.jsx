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
        <TextToolShell title="Hex ↔ Text" description="Convert text to hexadecimal and hex back to text or ASCII." leading={<BackButton />}>
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    <button type="button" className={`text-tool-button cursor-target${mode === "text-to-hex" ? " is-active" : ""}`} onClick={() => setMode("text-to-hex")}>Text → Hex</button>
                    <button type="button" className={`text-tool-button cursor-target${mode === "hex-to-text" ? " is-active" : ""}`} onClick={() => setMode("hex-to-text")}>Hex → Text</button>
                </div>
                <textarea className="text-tool-textarea" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-output-header"><h2 className="text-tool-section-title">Output</h2><CopyButton text={output.ok ? output.value : ""} disabled={!output.ok} /></div>
                {output.error ? <p className="text-tool-empty">{output.error}</p> : <textarea className="text-tool-textarea" value={output.value} readOnly />}
            </div>
        </TextToolShell>
    );
}

export default HexText;

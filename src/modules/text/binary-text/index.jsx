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
        <TextToolShell title="Binary ↔ Text" description="Convert text to binary and binary back to text or ASCII." leading={<BackButton />}>
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    <button type="button" className={`text-tool-button cursor-target${mode === "text-to-binary" ? " is-active" : ""}`} onClick={() => setMode("text-to-binary")}>Text → Binary</button>
                    <button type="button" className={`text-tool-button cursor-target${mode === "binary-to-text" ? " is-active" : ""}`} onClick={() => setMode("binary-to-text")}>Binary → Text</button>
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

export default BinaryText;

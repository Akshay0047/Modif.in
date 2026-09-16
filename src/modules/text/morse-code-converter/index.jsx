import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { morseToText, safeExecute, textToMorse } from "../_shared/encodingUtils";

function MorseCodeConverter() {
    const [input, setInput] = useState("SOS");
    const [mode, setMode] = useState("text-to-morse");

    const output = useMemo(
        () =>
            safeExecute("morse", () =>
                mode === "text-to-morse" ? textToMorse(input) : morseToText(input),
            ),
        [input, mode],
    );

    return (
        <TextToolShell title="Morse Code Converter" description="Convert text to Morse code and Morse code back to text." leading={<BackButton />}>
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    <button type="button" className={`text-tool-button cursor-target${mode === "text-to-morse" ? " is-active" : ""}`} onClick={() => setMode("text-to-morse")}>Text → Morse</button>
                    <button type="button" className={`text-tool-button cursor-target${mode === "morse-to-text" ? " is-active" : ""}`} onClick={() => setMode("morse-to-text")}>Morse → Text</button>
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

export default MorseCodeConverter;

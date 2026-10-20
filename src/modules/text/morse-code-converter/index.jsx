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
                    <button aria-pressed={mode === "text-to-morse"} type="button" className={`text-tool-button cursor-target${mode === "text-to-morse" ? " is-active" : ""}`} onClick={() => setMode("text-to-morse")}>Text → Morse</button>
                    <button aria-pressed={mode === "morse-to-text"} type="button" className={`text-tool-button cursor-target${mode === "morse-to-text" ? " is-active" : ""}`} onClick={() => setMode("morse-to-text")}>Morse → Text</button>
                </div>
                <label className="text-tool-label" htmlFor="morse-code-converter-input">{mode === "text-to-morse" ? "Text to encode" : "Morse code to decode"}</label>
                <textarea aria-invalid={Boolean(output.error)} aria-describedby={output.error ? "morse-code-converter-input-error" : undefined} id="morse-code-converter-input" className="text-tool-textarea" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-output-header"><h2 className="text-tool-section-title">Output</h2><CopyButton text={output.ok ? output.value : ""} disabled={!output.ok} /></div>
                {output.error ? <p id="morse-code-converter-input-error" className="text-tool-empty" role="alert">{output.error}</p> : <textarea aria-label="Morse conversion output" className="text-tool-textarea" value={output.value} readOnly />}
            </div>
        </TextToolShell>
    );
}

export default MorseCodeConverter;

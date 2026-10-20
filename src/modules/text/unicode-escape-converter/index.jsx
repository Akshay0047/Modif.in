import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import {
    safeExecute,
    textToUnicodeEscapes,
    unicodeEscapesToText,
} from "../_shared/encodingUtils";

function UnicodeEscapeConverter() {
    const [input, setInput] = useState("Hello 🌍");
    const [mode, setMode] = useState("text-to-escape");

    const output = useMemo(
        () =>
            safeExecute("unicode-escape", () =>
                mode === "text-to-escape"
                    ? textToUnicodeEscapes(input)
                    : unicodeEscapesToText(input),
            ),
        [input, mode],
    );

    return (
        <TextToolShell title="Unicode Escape Converter" description="Convert text to Unicode escape sequences and back again." leading={<BackButton />}>
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    <button aria-pressed={mode === "text-to-escape"} type="button" className={`text-tool-button cursor-target${mode === "text-to-escape" ? " is-active" : ""}`} onClick={() => setMode("text-to-escape")}>Text → Escapes</button>
                    <button aria-pressed={mode === "escape-to-text"} type="button" className={`text-tool-button cursor-target${mode === "escape-to-text" ? " is-active" : ""}`} onClick={() => setMode("escape-to-text")}>Escapes → Text</button>
                </div>
                <label className="text-tool-label" htmlFor="unicode-escape-converter-input">{mode === "text-to-escape" ? "Text to escape" : "Unicode escape sequences"}</label>
                <textarea aria-invalid={Boolean(output.error)} aria-describedby={output.error ? "unicode-escape-converter-input-error" : undefined} id="unicode-escape-converter-input" className="text-tool-textarea" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-output-header"><h2 className="text-tool-section-title">Output</h2><CopyButton text={output.ok ? output.value : ""} disabled={!output.ok} /></div>
                {output.error ? <p id="unicode-escape-converter-input-error" className="text-tool-empty" role="alert">{output.error}</p> : <textarea aria-label="Unicode escape conversion output" className="text-tool-textarea" value={output.value} readOnly />}
            </div>
        </TextToolShell>
    );
}

export default UnicodeEscapeConverter;

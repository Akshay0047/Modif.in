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
                    <button type="button" className={`text-tool-button cursor-target${mode === "text-to-escape" ? " is-active" : ""}`} onClick={() => setMode("text-to-escape")}>Text → Escapes</button>
                    <button type="button" className={`text-tool-button cursor-target${mode === "escape-to-text" ? " is-active" : ""}`} onClick={() => setMode("escape-to-text")}>Escapes → Text</button>
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

export default UnicodeEscapeConverter;

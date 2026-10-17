import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { numberToRoman, romanToNumber, safeExecute } from "../_shared/encodingUtils";

function RomanNumeralConverter() {
    const [input, setInput] = useState("2026");
    const [mode, setMode] = useState("number-to-roman");

    const output = useMemo(
        () =>
            safeExecute("roman", () =>
                mode === "number-to-roman"
                    ? numberToRoman(input)
                    : romanToNumber(input),
            ),
        [input, mode],
    );

    return (
        <TextToolShell title="Roman Numeral Converter" description="Convert numbers to Roman numerals and Roman numerals back to numbers (2026 ↔ MMXXVI)." leading={<BackButton />}>
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    <button type="button" className={`text-tool-button cursor-target${mode === "number-to-roman" ? " is-active" : ""}`} onClick={() => setMode("number-to-roman")}>Number → Roman</button>
                    <button type="button" className={`text-tool-button cursor-target${mode === "roman-to-number" ? " is-active" : ""}`} onClick={() => setMode("roman-to-number")}>Roman → Number</button>
                </div>
                <input id="roman-input" aria-label="Number or Roman numeral" aria-invalid={!output.ok} aria-describedby={output.error ? "roman-error" : undefined} className="text-tool-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={mode === "number-to-roman" ? "2026" : "MMXXVI"} />
                {output.error && <p id="roman-error" className="text-tool-empty" role="alert">{output.error}</p>}
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-output-header"><h2 className="text-tool-section-title">Output</h2><CopyButton text={output.ok ? output.value : ""} disabled={!output.ok} /></div>
                <textarea aria-label="Output" className="text-tool-textarea" value={output.value} readOnly />
            </div>
        </TextToolShell>
    );
}

export default RomanNumeralConverter;

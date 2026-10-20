import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { convertNumberBase, safeExecute } from "../_shared/encodingUtils";

const BASES = [
    { id: 2, label: "Binary" },
    { id: 8, label: "Octal" },
    { id: 10, label: "Decimal" },
    { id: 16, label: "Hexadecimal" },
];

function NumberBaseConverter() {
    const [input, setInput] = useState("2026");
    const [fromBase, setFromBase] = useState(10);

    const outputs = useMemo(
        () =>
            BASES.map((base) => ({
                ...base,
                result: safeExecute(`base-${base.id}`, () =>
                    convertNumberBase(input, fromBase, base.id),
                ),
            })),
        [input, fromBase],
    );
    const error = outputs.find((entry) => !entry.result.ok)?.result.error;

    return (
        <TextToolShell title="Number Base Converter" description="Convert numbers between binary, decimal, hexadecimal, and octal." leading={<BackButton />}>
            <div className="text-tool-panel">
                <span id="number-base-selection-label" className="text-tool-label">Input base</span>
                <div className="text-tool-controls" role="group" aria-labelledby="number-base-selection-label">
                    {BASES.map((base) => (
                        <button aria-pressed={fromBase === base.id} key={base.id} type="button" className={`text-tool-button cursor-target${fromBase === base.id ? " is-active" : ""}`} onClick={() => setFromBase(base.id)}>{base.label}</button>
                    ))}
                </div>
                <label className="text-tool-label" htmlFor="number-base-input">Number to convert</label>
                <input id="number-base-input" aria-invalid={Boolean(error)} aria-describedby={error ? "number-base-error" : undefined} className="text-tool-input" value={input} onChange={(e) => setInput(e.target.value)} />
                {error && <p id="number-base-error" className="text-tool-empty" role="alert">{error}</p>}
            </div>
            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Converted values</h2>
                <div className="text-tool-result-grid">
                    {outputs.map((entry) => (
                        <div key={entry.id} className="text-tool-result-card">
                            <div className="text-tool-result-card__header">
                                <span className="text-tool-result-card__label">{entry.label}</span>
                                <CopyButton text={entry.result.ok ? entry.result.value : ""} disabled={!entry.result.ok} />
                            </div>
                            <div className="text-tool-result-card__value">
                                {entry.result.value || "—"}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </TextToolShell>
    );
}

export default NumberBaseConverter;

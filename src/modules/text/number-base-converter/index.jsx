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

    return (
        <TextToolShell title="Number Base Converter" description="Convert numbers between binary, decimal, hexadecimal, and octal." leading={<BackButton />}>
            <div className="text-tool-panel">
                <label className="text-tool-label">Input base</label>
                <div className="text-tool-controls">
                    {BASES.map((base) => (
                        <button key={base.id} type="button" className={`text-tool-button cursor-target${fromBase === base.id ? " is-active" : ""}`} onClick={() => setFromBase(base.id)}>{base.label}</button>
                    ))}
                </div>
                <input className="text-tool-input" value={input} onChange={(e) => setInput(e.target.value)} />
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
                                {entry.result.error || entry.result.value || "—"}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </TextToolShell>
    );
}

export default NumberBaseConverter;

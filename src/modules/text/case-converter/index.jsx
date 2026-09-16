import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { CASE_OPTIONS } from "../_shared/textFormatter";

function CaseConverter() {
    const [text, setText] = useState("");
    const [activeCase, setActiveCase] = useState("upper");

    const output = useMemo(() => {
        const option = CASE_OPTIONS.find((entry) => entry.id === activeCase);
        return option ? option.convert(text) : text;
    }, [text, activeCase]);

    return (
        <TextToolShell
            title="Case Converter"
            description="Convert text to uppercase, lowercase, title case, sentence case, alternating case, and inverse case."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <label className="text-tool-label" htmlFor="case-converter-input">
                    Enter or paste your text
                </label>
                <textarea
                    id="case-converter-input"
                    className="text-tool-textarea"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Type text to convert its case…"
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Case options</h2>
                <div className="text-tool-controls">
                    {CASE_OPTIONS.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            className={`text-tool-button cursor-target${
                                activeCase === option.id ? " is-active" : ""
                            }`}
                            onClick={() => setActiveCase(option.id)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Converted text</h2>
                    <CopyButton text={output} />
                </div>
                <textarea
                    className="text-tool-textarea"
                    value={output}
                    readOnly
                    aria-label="Converted text output"
                />
            </div>
        </TextToolShell>
    );
}

export default CaseConverter;

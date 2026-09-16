import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { CODE_CASE_OPTIONS } from "../_shared/textFormatter";

function CodeCaseConverter() {
    const [text, setText] = useState("");
    const [activeCase, setActiveCase] = useState("camel");

    const output = useMemo(() => {
        const option = CODE_CASE_OPTIONS.find((entry) => entry.id === activeCase);
        return option ? option.convert(text) : text;
    }, [text, activeCase]);

    return (
        <TextToolShell
            title="Code Case Converter"
            description="Convert identifiers and phrases into camelCase, snake_case, kebab-case, and other developer naming styles."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <label
                    className="text-tool-label"
                    htmlFor="code-case-converter-input"
                >
                    Enter words or an identifier
                </label>
                <textarea
                    id="code-case-converter-input"
                    className="text-tool-textarea"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Example: user profile settings or user_profile_settings"
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Naming conventions</h2>
                <div className="text-tool-controls">
                    {CODE_CASE_OPTIONS.map((option) => (
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
                    <h2 className="text-tool-section-title">Converted output</h2>
                    <CopyButton text={output} />
                </div>
                <textarea
                    className="text-tool-textarea"
                    value={output}
                    readOnly
                    aria-label="Code case output"
                />
            </div>
        </TextToolShell>
    );
}

export default CodeCaseConverter;

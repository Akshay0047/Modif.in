import { useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import useDeveloperResult from "../_shared/useDeveloperResult";
import { formatCode } from "../_shared/developerUtils";

const LANGUAGES = [
    { id: "javascript", label: "JavaScript" },
    { id: "typescript", label: "TypeScript" },
    { id: "jsx", label: "JSX" },
    { id: "tsx", label: "TSX" },
    { id: "html", label: "HTML" },
    { id: "css", label: "CSS" },
    { id: "sql", label: "SQL" },
    { id: "json", label: "JSON" },
    { id: "xml", label: "XML" },
];

function CodeFormatter() {
    const [language, setLanguage] = useState("javascript");
    const [input, setInput] = useState('if(x){if(y){console.log("hi");}}');

    const output = useDeveloperResult(input, formatCode, language);

    return (
        <TextToolShell
            title="Code Formatter"
            description="Pretty-print JavaScript, TypeScript, HTML, CSS, SQL, JSON, and XML with proper indentation."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    {LANGUAGES.map((entry) => (
                        <button aria-pressed={language === entry.id}
                            key={entry.id}
                            type="button"
                            className={`text-tool-button cursor-target${
                                language === entry.id ? " is-active" : ""
                            }`}
                            onClick={() => setLanguage(entry.id)}
                        >
                            {entry.label}
                        </button>
                    ))}
                </div>
                <label className="text-tool-label" htmlFor="code-formatter-input">
                    Input code
                </label>
                <textarea
                    id="code-formatter-input"
                    aria-invalid={Boolean(output.error)}
                    aria-describedby={output.error ? "code-formatter-error" : undefined}
                    className="text-tool-textarea"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel" aria-busy={output.pending}>
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Formatted output</h2>
                    <CopyButton text={output.ok ? output.value : ""} disabled={!output.ok} />
                </div>
                {output.pending ? (
                    <p className="text-tool-empty" role="status">Formatting…</p>
                ) : output.error ? (
                    <p id="code-formatter-error" className="text-tool-empty" role="alert">{output.error}</p>
                ) : (
                    <textarea
                        className="text-tool-textarea"
                        value={output.value}
                        readOnly
                        aria-label="Formatted code output"
                    />
                )}
            </div>
        </TextToolShell>
    );
}

export default CodeFormatter;

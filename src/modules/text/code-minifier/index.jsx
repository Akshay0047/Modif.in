import { useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import useDeveloperResult from "../_shared/useDeveloperResult";
import { minifyCode } from "../_shared/developerUtils";

const LANGUAGES = [
    { id: "javascript", label: "JavaScript" },
    { id: "css", label: "CSS" },
    { id: "html", label: "HTML" },
    { id: "json", label: "JSON" },
];

function CodeMinifier() {
    const [language, setLanguage] = useState("javascript");
    const [input, setInput] = useState("function hello(name){ console.log('hi', name); }");

    const output = useDeveloperResult(input, minifyCode, language);

    return (
        <TextToolShell
            title="Code Minifier"
            description="Minify JavaScript, CSS, HTML, and JSON by removing unnecessary whitespace."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    {LANGUAGES.map((entry) => (
                        <button
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
                <label className="text-tool-label" htmlFor="code-minifier-input">Input code</label>
                <textarea
                    id="code-minifier-input"
                    aria-invalid={Boolean(output.error)}
                    aria-describedby={output.error ? "code-minifier-error" : undefined}
                    className="text-tool-textarea"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel" aria-busy={output.pending}>
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Minified output</h2>
                    <CopyButton text={output.ok ? output.value : ""} disabled={!output.ok} />
                </div>
                {output.pending ? (
                    <p className="text-tool-empty" role="status">Minifying…</p>
                ) : output.error ? (
                    <p id="code-minifier-error" className="text-tool-empty" role="alert">{output.error}</p>
                ) : (
                    <textarea
                        className="text-tool-textarea"
                        value={output.value}
                        readOnly
                        aria-label="Minified code output"
                    />
                )}
            </div>
        </TextToolShell>
    );
}

export default CodeMinifier;

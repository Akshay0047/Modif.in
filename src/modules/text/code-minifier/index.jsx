import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { minifyCode, safeExecute } from "../_shared/developerUtils";

const LANGUAGES = [
    { id: "javascript", label: "JavaScript" },
    { id: "css", label: "CSS" },
    { id: "html", label: "HTML" },
    { id: "json", label: "JSON" },
];

function CodeMinifier() {
    const [language, setLanguage] = useState("javascript");
    const [input, setInput] = useState("function hello(name){ console.log('hi', name); }");

    const output = useMemo(
        () => safeExecute("minify", () => minifyCode(input, language)),
        [input, language],
    );

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
                <textarea
                    className="text-tool-textarea"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Minified output</h2>
                    <CopyButton text={output.ok ? output.value : ""} disabled={!output.ok} />
                </div>
                {output.error ? (
                    <p className="text-tool-empty">{output.error}</p>
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

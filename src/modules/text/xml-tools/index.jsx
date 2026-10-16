import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import {
    formatXmlDocument,
    minifyXml,
    safeExecute,
    validateXml,
} from "../_shared/developerUtils";

const MODES = [
    { id: "format", label: "Format", run: formatXmlDocument },
    { id: "validate", label: "Validate", run: (value) => validateXml(value).message },
    { id: "minify", label: "Minify", run: minifyXml },
];

function XmlTools() {
    const [input, setInput] = useState(
        '<root><item id="1"><name>Modif</name></item></root>',
    );
    const [mode, setMode] = useState("format");

    const result = useMemo(() => {
        const selected = MODES.find((entry) => entry.id === mode);
        return safeExecute("xml", () => selected.run(input));
    }, [input, mode]);

    return (
        <TextToolShell
            title="XML Tools"
            description="Format, validate, and minify XML documents."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    {MODES.map((entry) => (
                        <button
                            key={entry.id}
                            type="button"
                            className={`text-tool-button cursor-target${
                                mode === entry.id ? " is-active" : ""
                            }`}
                            onClick={() => setMode(entry.id)}
                        >
                            {entry.label}
                        </button>
                    ))}
                </div>
                <label className="text-tool-label" htmlFor="xml-tools-input">XML document</label>
                <textarea aria-invalid={Boolean(result.error)} aria-describedby={result.error ? "xml-tools-input-error" : undefined} id="xml-tools-input"
                    className="text-tool-textarea"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Output</h2>
                    <CopyButton text={result.ok ? result.value : ""} disabled={!result.ok} />
                </div>
                {result.error ? (
                    <p id="xml-tools-input-error" className="text-tool-empty" role="alert">{result.error}</p>
                ) : (
                    <textarea
                        className="text-tool-textarea"
                        value={result.value}
                        readOnly
                        aria-label="XML tools output"
                    />
                )}
            </div>
        </TextToolShell>
    );
}

export default XmlTools;

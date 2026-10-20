import { useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import useDeveloperResult from "../_shared/useDeveloperResult";
import {
    formatJson,
    jsonToCsv,
    jsonToYaml,
    minifyJson,
    sortJsonKeys,
    validateJson,
    yamlToJson,
} from "../_shared/developerUtils";

const MODES = [
    { id: "format", label: "Format", run: (value) => formatJson(value) },
    { id: "minify", label: "Minify", run: (value) => minifyJson(value) },
    {
        id: "validate",
        label: "Validate",
        run: (value) => validateJson(value).message,
    },
    { id: "sort", label: "Sort keys", run: (value) => sortJsonKeys(value) },
    { id: "yaml", label: "JSON → YAML", run: (value) => jsonToYaml(value) },
    { id: "from-yaml", label: "YAML → JSON", run: (value) => yamlToJson(value) },
    { id: "csv", label: "JSON → CSV", run: (value) => jsonToCsv(value) },
];

function JsonTools() {
    const [input, setInput] = useState('{\n  "name": "Modif",\n  "tools": ["json"]\n}');
    const [mode, setMode] = useState("format");

    const selected = MODES.find((entry) => entry.id === mode);
    const result = useDeveloperResult(input, selected.run);

    return (
        <TextToolShell
            title="JSON Tools"
            description="Format, minify, validate, sort keys, and convert JSON to YAML or CSV."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    {MODES.map((entry) => (
                        <button aria-pressed={mode === entry.id}
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
                <label className="text-tool-label" htmlFor="json-tools-input">
                    Input
                </label>
                <textarea
                    id="json-tools-input"
                    aria-invalid={Boolean(result.error)}
                    aria-describedby={result.error ? "json-tools-error" : undefined}
                    className="text-tool-textarea"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel" aria-busy={result.pending}>
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Output</h2>
                    <CopyButton text={result.ok ? result.value : ""} disabled={!result.ok} />
                </div>
                {result.pending ? (
                    <p className="text-tool-empty" role="status">Converting…</p>
                ) : result.error ? (
                    <p id="json-tools-error" className="text-tool-empty" role="alert">{result.error}</p>
                ) : (
                    <textarea
                        className="text-tool-textarea"
                        value={result.value}
                        readOnly
                        aria-label="JSON tools output"
                    />
                )}
            </div>
        </TextToolShell>
    );
}

export default JsonTools;

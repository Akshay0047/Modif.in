import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import {
    generateQueryString,
    parseQueryString,
    safeExecute,
} from "../_shared/developerUtils";

function QueryStringTools() {
    const [parseInput, setParseInput] = useState("q=modif&page=2&sort=asc");
    const [generateInput, setGenerateInput] = useState(
        '{\n  "q": "modif",\n  "page": "2",\n  "sort": "asc"\n}',
    );

    const parsed = useMemo(
        () => safeExecute("parse", () => JSON.stringify(parseQueryString(parseInput), null, 2)),
        [parseInput],
    );

    const generated = useMemo(
        () => safeExecute("generate", () => generateQueryString(generateInput)),
        [generateInput],
    );

    return (
        <TextToolShell
            title="Query String Tools"
            description="Parse query strings into JSON and generate query strings. Repeated keys use arrays; null values are omitted."
            leading={<BackButton />}
        >
            <div className="text-tool-grid text-tool-grid--2">
                <div className="text-tool-panel">
                    <label className="text-tool-label" htmlFor="query-parse-input">
                        Query string to parse
                    </label>
                    <textarea
                        id="query-parse-input"
                        className="text-tool-textarea"
                        value={parseInput}
                        onChange={(event) => setParseInput(event.target.value)}
                        spellCheck={false}
                    />
                    <div className="text-tool-output-header" style={{ marginTop: "1rem" }}>
                        <h2 className="text-tool-section-title">Parsed JSON</h2>
                        <CopyButton
                            text={parsed.ok ? parsed.value : ""}
                            disabled={!parsed.ok}
                        />
                    </div>
                    {parsed.error ? (
                        <p className="text-tool-empty">{parsed.error}</p>
                    ) : (
                        <textarea
                            className="text-tool-textarea"
                            value={parsed.value}
                            readOnly
                            aria-label="Parsed query string"
                        />
                    )}
                </div>

                <div className="text-tool-panel">
                    <label className="text-tool-label" htmlFor="query-generate-input">
                        JSON object to encode
                    </label>
                    <textarea
                        id="query-generate-input"
                        className="text-tool-textarea"
                        value={generateInput}
                        onChange={(event) => setGenerateInput(event.target.value)}
                        spellCheck={false}
                    />
                    <div className="text-tool-output-header" style={{ marginTop: "1rem" }}>
                        <h2 className="text-tool-section-title">Generated query string</h2>
                        <CopyButton
                            text={generated.ok ? generated.value : ""}
                            disabled={!generated.ok}
                        />
                    </div>
                    {generated.error ? (
                        <p className="text-tool-empty">{generated.error}</p>
                    ) : (
                        <textarea
                            className="text-tool-textarea"
                            value={generated.value}
                            readOnly
                            aria-label="Generated query string"
                        />
                    )}
                </div>
            </div>
        </TextToolShell>
    );
}

export default QueryStringTools;

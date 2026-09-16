import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import {
    previewRegexReplace,
    safeExecute,
    testRegex,
} from "../_shared/developerUtils";

function RegexTester() {
    const [pattern, setPattern] = useState("\\b\\w+@\\w+\\.\\w+\\b");
    const [flags, setFlags] = useState("g");
    const [text, setText] = useState("Contact us at hello@modif.in or support@example.com");
    const [replacement, setReplacement] = useState("[redacted]");

    const matchResult = useMemo(
        () => safeExecute("regex", () => testRegex(pattern, flags, text)),
        [pattern, flags, text],
    );

    const replaceResult = useMemo(
        () =>
            safeExecute("replace", () =>
                previewRegexReplace(pattern, flags, text, replacement),
            ),
        [pattern, flags, text, replacement],
    );

    return (
        <TextToolShell
            title="Regex Tester"
            description="Test regular expression patterns, inspect matches and capture groups, and preview replacements."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <div className="text-tool-grid text-tool-grid--2">
                    <div>
                        <label className="text-tool-label" htmlFor="regex-pattern">
                            Pattern
                        </label>
                        <input
                            id="regex-pattern"
                            className="text-tool-input"
                            value={pattern}
                            onChange={(event) => setPattern(event.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-tool-label" htmlFor="regex-flags">
                            Flags
                        </label>
                        <input
                            id="regex-flags"
                            className="text-tool-input"
                            value={flags}
                            onChange={(event) => setFlags(event.target.value)}
                            placeholder="gimuy"
                        />
                    </div>
                </div>
                <label className="text-tool-label" htmlFor="regex-text">
                    Test text
                </label>
                <textarea
                    id="regex-text"
                    className="text-tool-textarea"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    spellCheck={false}
                />
                <label className="text-tool-label" htmlFor="regex-replacement">
                    Replacement
                </label>
                <input
                    id="regex-replacement"
                    className="text-tool-input"
                    value={replacement}
                    onChange={(event) => setReplacement(event.target.value)}
                />
            </div>

            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Matches</h2>
                {matchResult.error ? (
                    <p className="text-tool-empty">{matchResult.error}</p>
                ) : (
                    <div className="text-tool-table-wrap">
                        <table className="text-tool-table">
                            <thead>
                                <tr>
                                    <th>Match</th>
                                    <th>Index</th>
                                    <th>Groups</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matchResult.value.matches?.length ? (
                                    matchResult.value.matches.map((entry, index) => (
                                        <tr key={`${entry.index}-${index}`}>
                                            <td>{entry.match}</td>
                                            <td>{entry.index}</td>
                                            <td>
                                                {entry.groups.length
                                                    ? entry.groups.join(", ")
                                                    : "—"}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3}>No matches found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Replace preview</h2>
                    <CopyButton
                        text={replaceResult.ok ? replaceResult.value : ""}
                        disabled={!replaceResult.ok}
                    />
                </div>
                {replaceResult.error ? (
                    <p className="text-tool-empty">{replaceResult.error}</p>
                ) : (
                    <textarea
                        className="text-tool-textarea"
                        value={replaceResult.value}
                        readOnly
                        aria-label="Regex replace preview"
                    />
                )}
            </div>
        </TextToolShell>
    );
}

export default RegexTester;

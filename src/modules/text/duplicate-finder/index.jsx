import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import TextToolShell from "../_shared/TextToolShell";
import {
    findDuplicateLines,
    findDuplicateSentences,
    findDuplicateWords,
} from "../_shared/textMetrics";

function DuplicateFinder() {
    const [text, setText] = useState("");
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [trimLines, setTrimLines] = useState(true);

    const duplicateWords = useMemo(
        () => findDuplicateWords(text, caseSensitive),
        [text, caseSensitive],
    );
    const duplicateSentences = useMemo(
        () => findDuplicateSentences(text),
        [text],
    );
    const duplicateLines = useMemo(
        () => findDuplicateLines(text, trimLines),
        [text, trimLines],
    );

    return (
        <TextToolShell
            title="Duplicate Finder"
            description="Find repeated words, sentences, and lines in your text."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <label
                    className="text-tool-label"
                    htmlFor="duplicate-finder-input"
                >
                    Enter or paste your text
                </label>
                <textarea
                    id="duplicate-finder-input"
                    className="text-tool-textarea"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Paste text to detect duplicates…"
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    <button
                        type="button"
                        className={`text-tool-button${
                            caseSensitive ? " is-active" : ""
                        }`}
                        onClick={() => setCaseSensitive((value) => !value)}
                    >
                        Case-sensitive words
                    </button>
                    <button
                        type="button"
                        className={`text-tool-button${
                            trimLines ? " is-active" : ""
                        }`}
                        onClick={() => setTrimLines((value) => !value)}
                    >
                        Trim lines before matching
                    </button>
                </div>
            </div>

            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Duplicate words</h2>
                {duplicateWords.length === 0 ? (
                    <p className="text-tool-empty">No duplicate words found.</p>
                ) : (
                    <div className="text-tool-table-wrap">
                        <table className="text-tool-table">
                            <thead>
                                <tr>
                                    <th>Word</th>
                                    <th>Occurrences</th>
                                </tr>
                            </thead>
                            <tbody>
                                {duplicateWords.map((entry) => (
                                    <tr key={entry.word}>
                                        <td>{entry.word}</td>
                                        <td>{entry.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Repeated sentences</h2>
                {duplicateSentences.length === 0 ? (
                    <p className="text-tool-empty">
                        No repeated sentences found.
                    </p>
                ) : (
                    <div className="text-tool-table-wrap">
                        <table className="text-tool-table">
                            <thead>
                                <tr>
                                    <th>Sentence</th>
                                    <th>Occurrences</th>
                                </tr>
                            </thead>
                            <tbody>
                                {duplicateSentences.map((entry) => (
                                    <tr key={entry.text}>
                                        <td>{entry.text}</td>
                                        <td>{entry.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Duplicate lines</h2>
                {duplicateLines.length === 0 ? (
                    <p className="text-tool-empty">No duplicate lines found.</p>
                ) : (
                    <div className="text-tool-table-wrap">
                        <table className="text-tool-table">
                            <thead>
                                <tr>
                                    <th>Line</th>
                                    <th>Occurrences</th>
                                    <th>Line numbers</th>
                                </tr>
                            </thead>
                            <tbody>
                                {duplicateLines.map((entry) => (
                                    <tr key={entry.text}>
                                        <td>{entry.text}</td>
                                        <td>{entry.count}</td>
                                        <td>{entry.lines.join(", ")}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </TextToolShell>
    );
}

export default DuplicateFinder;

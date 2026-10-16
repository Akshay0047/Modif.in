import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import {
    countMatches,
    replaceMultiplePatterns,
    replaceText,
} from "../_shared/textFormatter";

function FindReplace() {
    const [text, setText] = useState("");
    const [findValue, setFindValue] = useState("");
    const [replaceValue, setReplaceValue] = useState("");
    const [useRegex, setUseRegex] = useState(false);
    const [caseSensitive, setCaseSensitive] = useState(true);
    const [multiMode, setMultiMode] = useState(false);
    const [patterns, setPatterns] = useState("");

    const result = useMemo(() => {
        try {
            const output = multiMode
                ? replaceMultiplePatterns(text, patterns, useRegex)
                : replaceText(text, findValue, replaceValue, { useRegex, caseSensitive });
            const matchCount = multiMode || !findValue
                ? null
                : countMatches(text, findValue, { useRegex, caseSensitive });
            return { output, matchCount, error: "" };
        } catch (error) {
            return { output: "", matchCount: null, error: `Invalid regular expression. ${error.message}` };
        }
    }, [
        text,
        findValue,
        replaceValue,
        useRegex,
        caseSensitive,
        multiMode,
        patterns,
    ]);

    const { output, matchCount, error } = result;

    return (
        <TextToolShell
            title="Find & Replace"
            description="Find and replace text with support for regex and multiple replacement patterns."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <label className="text-tool-label" htmlFor="find-replace-input">
                    Source text
                </label>
                <textarea
                    id="find-replace-input"
                    className="text-tool-textarea"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Paste the text you want to search and replace in…"
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    <button
                        type="button"
                        className={`text-tool-button cursor-target${
                            !multiMode ? " is-active" : ""
                        }`}
                        onClick={() => setMultiMode(false)}
                    >
                        Single replace
                    </button>
                    <button
                        type="button"
                        className={`text-tool-button cursor-target${
                            multiMode ? " is-active" : ""
                        }`}
                        onClick={() => setMultiMode(true)}
                    >
                        Multiple patterns
                    </button>
                    <button
                        type="button"
                        className={`text-tool-button cursor-target${
                            useRegex ? " is-active" : ""
                        }`}
                        onClick={() => setUseRegex((value) => !value)}
                    >
                        Use regex
                    </button>
                    {!multiMode ? (
                        <button
                            type="button"
                            className={`text-tool-button cursor-target${
                                caseSensitive ? " is-active" : ""
                            }`}
                            onClick={() =>
                                setCaseSensitive((value) => !value)
                            }
                        >
                            Case sensitive
                        </button>
                    ) : null}
                </div>

                {!multiMode ? (
                    <div className="text-tool-grid text-tool-grid--2">
                        <div>
                            <label
                                className="text-tool-label"
                                htmlFor="find-replace-find"
                            >
                                Find
                            </label>
                            <input
                                id="find-replace-find"
                                aria-invalid={Boolean(error)}
                                aria-describedby={error ? "find-replace-error" : undefined}
                                className="text-tool-input"
                                value={findValue}
                                onChange={(event) =>
                                    setFindValue(event.target.value)
                                }
                                placeholder="Text or regex pattern to find"
                            />
                            {error && <p id="find-replace-error" className="text-tool-empty" role="alert">{error}</p>}
                        </div>
                        <div>
                            <label
                                className="text-tool-label"
                                htmlFor="find-replace-replace"
                            >
                                Replace with
                            </label>
                            <input
                                id="find-replace-replace"
                                className="text-tool-input"
                                value={replaceValue}
                                onChange={(event) =>
                                    setReplaceValue(event.target.value)
                                }
                                placeholder="Replacement text"
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        <label
                            className="text-tool-label"
                            htmlFor="find-replace-patterns"
                        >
                            Replacement patterns
                        </label>
                        <textarea
                            id="find-replace-patterns"
                            aria-invalid={Boolean(error)}
                            aria-describedby={error ? "find-replace-error" : undefined}
                            className="text-tool-textarea"
                            value={patterns}
                            onChange={(event) => setPatterns(event.target.value)}
                            placeholder={"find|replace\nhello|world\nfoo|bar"}
                            spellCheck={false}
                        />
                        {error && <p id="find-replace-error" className="text-tool-empty" role="alert">{error}</p>}
                        <p className="text-tool-hint">
                            Enter one pattern per line using the format{" "}
                            <code>find|replace</code>.
                        </p>
                    </>
                )}

                {matchCount !== null ? (
                    <p className="text-tool-hint">
                        Matches found: {matchCount.toLocaleString()}
                    </p>
                ) : null}
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Result</h2>
                    <CopyButton text={output} disabled={Boolean(error)} />
                </div>
                <textarea
                    className="text-tool-textarea"
                    value={output}
                    readOnly
                    aria-label="Find and replace output"
                />
            </div>
        </TextToolShell>
    );
}

export default FindReplace;

import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import {
    TEXT_CLEANER_OPTIONS,
    cleanText,
} from "../_shared/textFormatter";

function TextCleaner() {
    const [text, setText] = useState("");
    const [operations, setOperations] = useState({
        removeExtraSpaces: true,
        normalizeWhitespace: false,
        trimLines: false,
        removeEmptyLines: false,
        removePunctuation: false,
        removeNumbers: false,
        removeSpecialCharacters: false,
        keepOnlyLettersNumbers: false,
    });

    const output = useMemo(
        () => cleanText(text, operations),
        [text, operations],
    );

    const toggleOperation = (id) => {
        setOperations((current) => ({
            ...current,
            [id]: !current[id],
        }));
    };

    return (
        <TextToolShell
            title="Text Cleaner"
            description="Clean up whitespace, punctuation, numbers, and unwanted characters from your text."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <label className="text-tool-label" htmlFor="text-cleaner-input">
                    Enter or paste your text
                </label>
                <textarea
                    id="text-cleaner-input"
                    className="text-tool-textarea"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Paste messy text to clean it up…"
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Cleaning options</h2>
                <div className="text-tool-checkbox-grid">
                    {TEXT_CLEANER_OPTIONS.map((option) => (
                        <label
                            key={option.id}
                            className="text-tool-checkbox cursor-target"
                        >
                            <input
                                type="checkbox"
                                checked={Boolean(operations[option.id])}
                                onChange={() => toggleOperation(option.id)}
                            />
                            {option.label}
                        </label>
                    ))}
                </div>
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Cleaned text</h2>
                    <CopyButton text={output} />
                </div>
                <textarea
                    className="text-tool-textarea"
                    value={output}
                    readOnly
                    aria-label="Cleaned text output"
                />
            </div>
        </TextToolShell>
    );
}

export default TextCleaner;

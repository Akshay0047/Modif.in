import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import {
    joinLines,
    removeDuplicateLines,
    reverseLines,
    shuffleLines,
    sortLines,
    splitLines,
} from "../_shared/textFormatter";

const LINE_OPERATIONS = [
    { id: "sort-asc", label: "Sort lines (A→Z)" },
    { id: "sort-desc", label: "Sort lines (Z→A)" },
    { id: "reverse", label: "Reverse lines" },
    { id: "shuffle", label: "Shuffle lines" },
    { id: "dedupe", label: "Remove duplicate lines" },
    { id: "join", label: "Join lines" },
    { id: "split", label: "Split lines" },
];

function LineTools() {
    const [text, setText] = useState("");
    const [operation, setOperation] = useState("sort-asc");
    const [delimiter, setDelimiter] = useState("");
    const [caseSensitiveDedupe, setCaseSensitiveDedupe] = useState(false);

    const output = useMemo(() => {
        switch (operation) {
            case "sort-asc":
                return sortLines(text, "asc");
            case "sort-desc":
                return sortLines(text, "desc");
            case "reverse":
                return reverseLines(text);
            case "shuffle":
                return shuffleLines(text);
            case "dedupe":
                return removeDuplicateLines(text, caseSensitiveDedupe);
            case "join":
                return joinLines(text, delimiter);
            case "split":
                return splitLines(text, delimiter || "\n");
            default:
                return text;
        }
    }, [text, operation, delimiter, caseSensitiveDedupe]);

    const needsDelimiter = operation === "join" || operation === "split";

    return (
        <TextToolShell
            title="Line Tools"
            description="Sort, reverse, shuffle, deduplicate, join, and split lines of text."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <label className="text-tool-label" htmlFor="line-tools-input">
                    Enter or paste your text
                </label>
                <textarea
                    id="line-tools-input"
                    className="text-tool-textarea"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Enter one item per line…"
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Line operations</h2>
                <div className="text-tool-controls">
                    {LINE_OPERATIONS.map((entry) => (
                        <button
                            key={entry.id}
                            type="button"
                            className={`text-tool-button cursor-target${
                                operation === entry.id ? " is-active" : ""
                            }`}
                            onClick={() => setOperation(entry.id)}
                        >
                            {entry.label}
                        </button>
                    ))}
                </div>

                {operation === "dedupe" ? (
                    <div className="text-tool-controls">
                        <button
                            type="button"
                            className={`text-tool-button cursor-target${
                                caseSensitiveDedupe ? " is-active" : ""
                            }`}
                            onClick={() =>
                                setCaseSensitiveDedupe((value) => !value)
                            }
                        >
                            Case-sensitive dedupe
                        </button>
                    </div>
                ) : null}

                {needsDelimiter ? (
                    <>
                        <label
                            className="text-tool-label"
                            htmlFor="line-tools-delimiter"
                        >
                            Delimiter
                        </label>
                        <input
                            id="line-tools-delimiter"
                            className="text-tool-input"
                            value={delimiter}
                            onChange={(event) => setDelimiter(event.target.value)}
                            placeholder={
                                operation === "join"
                                    ? "Leave empty to join with no separator"
                                    : "Enter a delimiter to split on"
                            }
                        />
                    </>
                ) : null}
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Result</h2>
                    <CopyButton text={output} />
                </div>
                <textarea
                    className="text-tool-textarea"
                    value={output}
                    readOnly
                    aria-label="Line tools output"
                />
            </div>
        </TextToolShell>
    );
}

export default LineTools;

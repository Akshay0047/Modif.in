import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import {
    addLineNumbers,
    addPrefixSuffixToLines,
    indentLines,
    unindentLines,
    wrapText,
} from "../_shared/textFormatter";

const PREFIX_SUFFIX_MODES = [
    { id: "affix", label: "Add to every line" },
    { id: "number", label: "Add numbering" },
    { id: "wrap", label: "Wrap text" },
    { id: "indent", label: "Indent" },
    { id: "unindent", label: "Unindent" },
];

function PrefixSuffix() {
    const [text, setText] = useState("");
    const [mode, setMode] = useState("affix");
    const [prefix, setPrefix] = useState("");
    const [suffix, setSuffix] = useState("");
    const [startNumber, setStartNumber] = useState("1");
    const [numberSeparator, setNumberSeparator] = useState(". ");
    const [wrapper, setWrapper] = useState("[]");
    const [indentSpaces, setIndentSpaces] = useState("2");

    const output = useMemo(() => {
        switch (mode) {
            case "affix":
                return addPrefixSuffixToLines(text, prefix, suffix);
            case "number":
                return addLineNumbers(
                    text,
                    Number.parseInt(startNumber, 10) || 1,
                    numberSeparator,
                );
            case "wrap":
                return wrapText(text, wrapper);
            case "indent":
                return indentLines(text, Number.parseInt(indentSpaces, 10) || 0);
            case "unindent":
                return unindentLines(
                    text,
                    Number.parseInt(indentSpaces, 10) || 0,
                );
            default:
                return text;
        }
    }, [
        text,
        mode,
        prefix,
        suffix,
        startNumber,
        numberSeparator,
        wrapper,
        indentSpaces,
    ]);

    return (
        <TextToolShell
            title="Prefix & Suffix"
            description="Add prefixes, suffixes, numbering, wrappers, and indentation to lines of text."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <label className="text-tool-label" htmlFor="prefix-suffix-input">
                    Enter or paste your text
                </label>
                <textarea
                    id="prefix-suffix-input"
                    className="text-tool-textarea"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Enter one line per row…"
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Operation</h2>
                <div className="text-tool-controls">
                    {PREFIX_SUFFIX_MODES.map((entry) => (
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

                {mode === "affix" ? (
                    <div className="text-tool-grid text-tool-grid--2">
                        <div>
                            <label
                                className="text-tool-label"
                                htmlFor="prefix-suffix-prefix"
                            >
                                Prefix
                            </label>
                            <input
                                id="prefix-suffix-prefix"
                                className="text-tool-input"
                                value={prefix}
                                onChange={(event) => setPrefix(event.target.value)}
                                placeholder="Text before each line"
                            />
                        </div>
                        <div>
                            <label
                                className="text-tool-label"
                                htmlFor="prefix-suffix-suffix"
                            >
                                Suffix
                            </label>
                            <input
                                id="prefix-suffix-suffix"
                                className="text-tool-input"
                                value={suffix}
                                onChange={(event) => setSuffix(event.target.value)}
                                placeholder="Text after each line"
                            />
                        </div>
                    </div>
                ) : null}

                {mode === "number" ? (
                    <div className="text-tool-grid text-tool-grid--2">
                        <div>
                            <label
                                className="text-tool-label"
                                htmlFor="prefix-suffix-start"
                            >
                                Start number
                            </label>
                            <input
                                id="prefix-suffix-start"
                                className="text-tool-input"
                                type="number"
                                min="0"
                                value={startNumber}
                                onChange={(event) =>
                                    setStartNumber(event.target.value)
                                }
                            />
                        </div>
                        <div>
                            <label
                                className="text-tool-label"
                                htmlFor="prefix-suffix-separator"
                            >
                                Separator
                            </label>
                            <input
                                id="prefix-suffix-separator"
                                className="text-tool-input"
                                value={numberSeparator}
                                onChange={(event) =>
                                    setNumberSeparator(event.target.value)
                                }
                                placeholder=". "
                            />
                        </div>
                    </div>
                ) : null}

                {mode === "wrap" ? (
                    <>
                        <label
                            className="text-tool-label"
                            htmlFor="prefix-suffix-wrapper"
                        >
                            Wrapper characters
                        </label>
                        <input
                            id="prefix-suffix-wrapper"
                            aria-describedby="prefix-suffix-wrapper-hint"
                            className="text-tool-input"
                            value={wrapper}
                            onChange={(event) => setWrapper(event.target.value)}
                            placeholder="[] or () or quotes"
                        />
                        <p id="prefix-suffix-wrapper-hint" className="text-tool-hint">
                            The wrapper is split in half and placed around each
                            line.
                        </p>
                    </>
                ) : null}

                {mode === "indent" || mode === "unindent" ? (
                    <>
                        <label
                            className="text-tool-label"
                            htmlFor="prefix-suffix-indent"
                        >
                            Spaces
                        </label>
                        <input
                            id="prefix-suffix-indent"
                            className="text-tool-input"
                            type="number"
                            min="1"
                            max="32"
                            value={indentSpaces}
                            onChange={(event) =>
                                setIndentSpaces(event.target.value)
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
                    aria-label="Prefix and suffix output"
                />
            </div>
        </TextToolShell>
    );
}

export default PrefixSuffix;

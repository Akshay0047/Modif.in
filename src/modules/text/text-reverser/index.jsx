import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import {
    reverseCharacters,
    reverseEntireText,
    reverseWords,
} from "../_shared/textFormatter";

const REVERSAL_MODES = [
    { id: "entire", label: "Reverse entire text", convert: reverseEntireText },
    { id: "words", label: "Reverse words", convert: reverseWords },
    { id: "characters", label: "Reverse characters", convert: reverseCharacters },
];

function TextReverser() {
    const [text, setText] = useState("");
    const [mode, setMode] = useState("entire");

    const output = useMemo(() => {
        const option = REVERSAL_MODES.find((entry) => entry.id === mode);
        return option ? option.convert(text) : text;
    }, [text, mode]);

    return (
        <TextToolShell
            title="Text Reverser"
            description="Reverse entire text, individual words, or characters instantly."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <label className="text-tool-label" htmlFor="text-reverser-input">
                    Enter or paste your text
                </label>
                <textarea
                    id="text-reverser-input"
                    className="text-tool-textarea"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Type text to reverse…"
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Reversal mode</h2>
                <div className="text-tool-controls">
                    {REVERSAL_MODES.map((entry) => (
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
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Reversed text</h2>
                    <CopyButton text={output} />
                </div>
                <textarea
                    className="text-tool-textarea"
                    value={output}
                    readOnly
                    aria-label="Reversed text output"
                />
            </div>
        </TextToolShell>
    );
}

export default TextReverser;

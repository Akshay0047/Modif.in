import { useMemo, useState } from "react";
import TextToolShell from "../_shared/TextToolShell";
import {
    countCharacters,
    countLines,
    countParagraphs,
    countSentences,
    countWords,
} from "../_shared/textMetrics";

function TextCounter() {
    const [text, setText] = useState("");

    const stats = useMemo(
        () => ({
            words: countWords(text),
            characters: countCharacters(text, true),
            charactersNoSpaces: countCharacters(text, false),
            sentences: countSentences(text),
            paragraphs: countParagraphs(text),
            lines: countLines(text),
        }),
        [text],
    );

    const statItems = [
        { label: "Words", value: stats.words },
        { label: "Characters", value: stats.characters },
        { label: "Characters (no spaces)", value: stats.charactersNoSpaces },
        { label: "Sentences", value: stats.sentences },
        { label: "Paragraphs", value: stats.paragraphs },
        { label: "Lines", value: stats.lines },
    ];

    return (
        <TextToolShell
            title="Text Counter"
            description="Measure words, characters, sentences, paragraphs, and lines in real time."
        >
            <div className="text-tool-panel">
                <label className="text-tool-label" htmlFor="text-counter-input">
                    Enter or paste your text
                </label>
                <textarea
                    id="text-counter-input"
                    className="text-tool-textarea"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Start typing to see live counts…"
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Counts</h2>
                <div className="text-tool-stat-grid">
                    {statItems.map((item) => (
                        <div key={item.label} className="text-tool-stat">
                            <span className="text-tool-stat__label">
                                {item.label}
                            </span>
                            <span className="text-tool-stat__value">
                                {item.value.toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </TextToolShell>
    );
}

export default TextCounter;

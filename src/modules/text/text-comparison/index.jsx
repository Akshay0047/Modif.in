import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import TextToolShell from "../_shared/TextToolShell";
import { diffTexts } from "../_shared/textMetrics";

function TextComparison() {
    const [originalText, setOriginalText] = useState("");
    const [revisedText, setRevisedText] = useState("");
    const [diffMode, setDiffMode] = useState("word");

    const diff = useMemo(
        () => diffTexts(originalText, revisedText, diffMode),
        [originalText, revisedText, diffMode],
    );

    return (
        <TextToolShell
            title="Text Comparison"
            description="Compare two texts side by side with word-level or character-level diffs."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    <span className="text-tool-label" style={{ marginBottom: 0 }}>
                        Diff mode
                    </span>
                    <button
                        type="button"
                        className={`text-tool-button${
                            diffMode === "word" ? " is-active" : ""
                        }`}
                        onClick={() => setDiffMode("word")}
                    >
                        Word-level
                    </button>
                    <button
                        type="button"
                        className={`text-tool-button${
                            diffMode === "char" ? " is-active" : ""
                        }`}
                        onClick={() => setDiffMode("char")}
                    >
                        Character-level
                    </button>
                </div>

                <div className="text-tool-split">
                    <div>
                        <label
                            className="text-tool-label"
                            htmlFor="comparison-original"
                        >
                            Original text
                        </label>
                        <textarea
                            id="comparison-original"
                            className="text-tool-textarea"
                            value={originalText}
                            onChange={(event) =>
                                setOriginalText(event.target.value)
                            }
                            placeholder="Paste the original version…"
                            spellCheck={false}
                        />
                    </div>
                    <div>
                        <label
                            className="text-tool-label"
                            htmlFor="comparison-revised"
                        >
                            Revised text
                        </label>
                        <textarea
                            id="comparison-revised"
                            className="text-tool-textarea"
                            value={revisedText}
                            onChange={(event) =>
                                setRevisedText(event.target.value)
                            }
                            placeholder="Paste the revised version…"
                            spellCheck={false}
                        />
                    </div>
                </div>
            </div>

            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Change summary</h2>
                <div className="text-tool-stat-grid">
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">Added</span>
                        <span className="text-tool-stat__value">
                            {diff.added.toLocaleString()}
                        </span>
                    </div>
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">Removed</span>
                        <span className="text-tool-stat__value">
                            {diff.removed.toLocaleString()}
                        </span>
                    </div>
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">Unchanged</span>
                        <span className="text-tool-stat__value">
                            {diff.unchanged.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Diff output</h2>
                {!originalText && !revisedText ? (
                    <p className="text-tool-empty">
                        Enter text in both panels to generate a comparison.
                    </p>
                ) : (
                    <div className="text-tool-diff" aria-live="polite">
                        {diff.parts.map((part, index) => {
                            if (part.type === "added") {
                                return (
                                    <span
                                        key={`${part.type}-${index}`}
                                        className="text-tool-diff__added"
                                    >
                                        {part.value}
                                    </span>
                                );
                            }

                            if (part.type === "removed") {
                                return (
                                    <span
                                        key={`${part.type}-${index}`}
                                        className="text-tool-diff__removed"
                                    >
                                        {part.value}
                                    </span>
                                );
                            }

                            return (
                                <span key={`${part.type}-${index}`}>
                                    {part.value}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>
        </TextToolShell>
    );
}

export default TextComparison;

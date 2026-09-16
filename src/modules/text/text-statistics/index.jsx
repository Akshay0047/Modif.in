import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import TextToolShell from "../_shared/TextToolShell";
import {
    computeReadabilityStats,
    getCharacterFrequency,
    getWordFrequency,
} from "../_shared/textMetrics";

function formatNumber(value, digits = 1) {
    return Number.isFinite(value) ? value.toFixed(digits) : "0";
}

function TextStatistics() {
    const [text, setText] = useState("");

    const stats = useMemo(() => computeReadabilityStats(text), [text]);
    const wordFrequency = useMemo(() => getWordFrequency(text), [text]);
    const characterFrequency = useMemo(
        () => getCharacterFrequency(text),
        [text],
    );

    const readabilityLabel = (score) => {
        if (score >= 90) return "Very easy";
        if (score >= 80) return "Easy";
        if (score >= 70) return "Fairly easy";
        if (score >= 60) return "Standard";
        if (score >= 50) return "Fairly difficult";
        if (score >= 30) return "Difficult";
        return "Very difficult";
    };

    return (
        <TextToolShell
            title="Text Statistics"
            description="Analyze averages, frequency distributions, and basic readability metrics."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <label
                    className="text-tool-label"
                    htmlFor="text-statistics-input"
                >
                    Enter or paste your text
                </label>
                <textarea
                    id="text-statistics-input"
                    className="text-tool-textarea"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Paste text to analyze word length, sentence length, and frequency…"
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Averages</h2>
                <div className="text-tool-stat-grid">
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">
                            Average word length
                        </span>
                        <span className="text-tool-stat__value">
                            {formatNumber(stats.averageWordLength, 2)}
                        </span>
                    </div>
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">
                            Average sentence length
                        </span>
                        <span className="text-tool-stat__value">
                            {formatNumber(stats.averageSentenceLength, 2)}
                        </span>
                    </div>
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">
                            Syllables per word
                        </span>
                        <span className="text-tool-stat__value">
                            {formatNumber(stats.syllablesPerWord, 2)}
                        </span>
                    </div>
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">
                            Long words (&gt; 6 chars)
                        </span>
                        <span className="text-tool-stat__value">
                            {formatNumber(stats.longWordPercentage, 1)}%
                        </span>
                    </div>
                </div>
            </div>

            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Readability</h2>
                <div className="text-tool-stat-grid">
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">
                            Flesch reading ease
                        </span>
                        <span className="text-tool-stat__value">
                            {formatNumber(stats.fleschReadingEase, 1)}
                        </span>
                    </div>
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">Level</span>
                        <span className="text-tool-stat__value">
                            {text.trim()
                                ? readabilityLabel(stats.fleschReadingEase)
                                : "—"}
                        </span>
                    </div>
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">Words</span>
                        <span className="text-tool-stat__value">
                            {stats.wordCount.toLocaleString()}
                        </span>
                    </div>
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">Sentences</span>
                        <span className="text-tool-stat__value">
                            {stats.sentenceCount.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            <div className="text-tool-grid text-tool-grid--2">
                <div className="text-tool-panel">
                    <h2 className="text-tool-section-title">Word frequency</h2>
                    {wordFrequency.length === 0 ? (
                        <p className="text-tool-empty">No words to analyze yet.</p>
                    ) : (
                        <div className="text-tool-table-wrap">
                            <table className="text-tool-table">
                                <thead>
                                    <tr>
                                        <th>Word</th>
                                        <th>Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {wordFrequency.slice(0, 25).map((entry) => (
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
                    <h2 className="text-tool-section-title">
                        Character frequency
                    </h2>
                    {characterFrequency.length === 0 ? (
                        <p className="text-tool-empty">
                            No characters to analyze yet.
                        </p>
                    ) : (
                        <div className="text-tool-table-wrap">
                            <table className="text-tool-table">
                                <thead>
                                    <tr>
                                        <th>Character</th>
                                        <th>Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {characterFrequency
                                        .slice(0, 25)
                                        .map((entry) => (
                                            <tr key={entry.char}>
                                                <td>
                                                    {entry.char === " "
                                                        ? "(space)"
                                                        : entry.char}
                                                </td>
                                                <td>{entry.count}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </TextToolShell>
    );
}

export default TextStatistics;

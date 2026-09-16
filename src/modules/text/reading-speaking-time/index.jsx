import { useMemo, useState } from "react";
import TextToolShell from "../_shared/TextToolShell";
import { countWords } from "../_shared/textMetrics";

function formatDuration(minutes) {
    if (!Number.isFinite(minutes) || minutes <= 0) {
        return "0 sec";
    }

    const totalSeconds = Math.max(1, Math.round(minutes * 60));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    if (mins === 0) return `${secs} sec`;
    if (secs === 0) return `${mins} min`;
    return `${mins} min ${secs} sec`;
}

function ReadingSpeakingTime() {
    const [text, setText] = useState("");
    const [readingWpm, setReadingWpm] = useState(200);
    const [speakingWpm, setSpeakingWpm] = useState(130);

    const wordCount = useMemo(() => countWords(text), [text]);

    const readingMinutes = wordCount / Math.max(readingWpm, 1);
    const speakingMinutes = wordCount / Math.max(speakingWpm, 1);

    return (
        <TextToolShell
            title="Reading or Speaking Time"
            description="Estimate how long it takes to read or speak your text at adjustable speeds."
        >
            <div className="text-tool-panel">
                <label
                    className="text-tool-label"
                    htmlFor="reading-speaking-input"
                >
                    Enter or paste your text
                </label>
                <textarea
                    id="reading-speaking-input"
                    className="text-tool-textarea"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Paste an article, script, or speech draft…"
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-grid text-tool-grid--2">
                <div className="text-tool-panel">
                    <h2 className="text-tool-section-title">Reading speed</h2>
                    <label className="text-tool-label" htmlFor="reading-wpm">
                        {readingWpm} words per minute
                    </label>
                    <input
                        id="reading-wpm"
                        className="text-tool-range"
                        type="range"
                        min={80}
                        max={400}
                        step={5}
                        value={readingWpm}
                        onChange={(event) =>
                            setReadingWpm(Number(event.target.value))
                        }
                    />
                    <div className="text-tool-range-meta">
                        <span>Slow (80)</span>
                        <span>Fast (400)</span>
                    </div>
                </div>

                <div className="text-tool-panel">
                    <h2 className="text-tool-section-title">Speaking speed</h2>
                    <label className="text-tool-label" htmlFor="speaking-wpm">
                        {speakingWpm} words per minute
                    </label>
                    <input
                        id="speaking-wpm"
                        className="text-tool-range"
                        type="range"
                        min={80}
                        max={220}
                        step={5}
                        value={speakingWpm}
                        onChange={(event) =>
                            setSpeakingWpm(Number(event.target.value))
                        }
                    />
                    <div className="text-tool-range-meta">
                        <span>Slow (80)</span>
                        <span>Fast (220)</span>
                    </div>
                </div>
            </div>

            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Estimates</h2>
                <div className="text-tool-stat-grid">
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">Word count</span>
                        <span className="text-tool-stat__value">
                            {wordCount.toLocaleString()}
                        </span>
                    </div>
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">
                            Estimated reading time
                        </span>
                        <span className="text-tool-stat__value">
                            {formatDuration(readingMinutes)}
                        </span>
                    </div>
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">
                            Estimated speaking time
                        </span>
                        <span className="text-tool-stat__value">
                            {formatDuration(speakingMinutes)}
                        </span>
                    </div>
                </div>
            </div>
        </TextToolShell>
    );
}

export default ReadingSpeakingTime;

import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import TextToolShell from "../_shared/TextToolShell";
import WhitespaceHighlightPreview from "../_shared/WhitespaceHighlightPreview";
import { analyzeWhitespace } from "../_shared/textMetrics";

function WhitespaceAnalyzer() {
    const [text, setText] = useState("");

    const analysis = useMemo(() => analyzeWhitespace(text), [text]);

    const summaryStats = [
        { label: "Total lines", value: analysis.totalLines },
        { label: "Empty lines", value: analysis.emptyLines },
        { label: "Lines with leading spaces", value: analysis.leadingSpaceLines },
        {
            label: "Lines with trailing spaces",
            value: analysis.trailingSpaceLines,
        },
        {
            label: "Consecutive space groups",
            value: analysis.consecutiveSpaceGroups,
        },
        { label: "Tab characters", value: analysis.tabCount },
    ];

    return (
        <TextToolShell
            title="Whitespace Analyzer"
            description="Inspect leading, trailing, consecutive, and unusual whitespace in your text."
            leading={<BackButton />}
        >
            <div className="text-tool-split">
                <div className="text-tool-panel text-tool-split__panel">
                    <label
                        className="text-tool-label"
                        htmlFor="whitespace-analyzer-input"
                    >
                        Enter or paste your text
                    </label>
                    <textarea
                        id="whitespace-analyzer-input"
                        className="text-tool-textarea"
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        placeholder="Paste text to analyze spaces, tabs, and blank lines…"
                        spellCheck={false}
                    />
                </div>

                <div className="text-tool-panel text-tool-split__panel">
                    <h2 className="text-tool-section-title">
                        Unusual whitespace characters
                    </h2>
                    <WhitespaceHighlightPreview text={text} />
                </div>
            </div>

            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Whitespace summary</h2>
                <div className="text-tool-stat-grid">
                    {summaryStats.map((item) => (
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

export default WhitespaceAnalyzer;

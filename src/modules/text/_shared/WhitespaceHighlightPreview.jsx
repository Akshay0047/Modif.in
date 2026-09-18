import {
    getWhitespaceHighlightClass,
    segmentWhitespaceRuns,
} from "./whitespaceHighlight";

function WhitespaceHighlightPreview({ text }) {
    if (!text) {
        return (
            <p className="text-tool-empty">
                Start typing to preview whitespace highlighting.
            </p>
        );
    }

    const segments = segmentWhitespaceRuns(text);

    return (
        <div
            className="text-tool-whitespace-preview"
            aria-label="Whitespace highlight preview"
        >
            {segments.map((segment, index) => {
                if (segment.type === "text") {
                    return <span key={index}>{segment.value}</span>;
                }

                return (
                    <span
                        key={index}
                        className={getWhitespaceHighlightClass(
                            segment.runLength,
                        )}
                    >
                        {segment.value}
                    </span>
                );
            })}
        </div>
    );
}

export default WhitespaceHighlightPreview;

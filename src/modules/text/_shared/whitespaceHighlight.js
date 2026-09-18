export function segmentWhitespaceRuns(text) {
    const segments = [];
    let index = 0;

    while (index < text.length) {
        if (/\s/.test(text[index])) {
            let runLength = 0;
            const start = index;

            while (index < text.length && /\s/.test(text[index])) {
                runLength += 1;
                index += 1;
            }

            segments.push({
                type: "whitespace",
                value: text.slice(start, index),
                runLength,
            });
        } else {
            const start = index;

            while (index < text.length && !/\s/.test(text[index])) {
                index += 1;
            }

            segments.push({
                type: "text",
                value: text.slice(start, index),
            });
        }
    }

    return segments;
}

export function getWhitespaceHighlightClass(runLength) {
    if (runLength <= 1) return "text-tool-ws-highlight--1";
    if (runLength === 2) return "text-tool-ws-highlight--2";
    if (runLength === 3) return "text-tool-ws-highlight--3";
    return "text-tool-ws-highlight--4";
}

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const UNICODE_FONT = '"Segoe UI", "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Noto Sans", sans-serif';
const RASTER_SCALE = 2;
const RASTER_PADDING = 2;
const graphemeSegmenter = typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function graphemes(text) {
    return graphemeSegmenter
        ? Array.from(graphemeSegmenter.segment(text), (item) => item.segment)
        : Array.from(text);
}

// Tabs become four spaces. Each explicit newline starts a new line.
// A blank line adds a paragraph gap. Long lines wrap on spaces, and a
// word wider than the page breaks on characters.
export function planTextLayout(text, measure, maxWidth) {
    const normalized = String(text ?? "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\t/g, "    ");
    const planned = [];

    for (const rawLine of normalized.split("\n")) {
        if (!rawLine.trim()) {
            planned.push({ kind: "blank" });
            continue;
        }
        planned.push(...wrapLine(rawLine, measure, maxWidth).map((line) => ({ kind: "text", text: line })));
    }

    return planned;
}

function wrapLine(rawLine, measure, maxWidth) {
    if (measure(rawLine) <= maxWidth) return [rawLine];

    const indent = rawLine.match(/^ +/)?.[0] ?? "";
    const words = rawLine.trim().split(/ +/).filter(Boolean);
    const lines = [];
    let current = "";

    const breakWord = (word) => {
        let chunk = "";
        for (const character of graphemes(word)) {
            const next = chunk + character;
            if (chunk && measure(next) > maxWidth) {
                lines.push(chunk);
                chunk = character;
            } else {
                chunk = next;
            }
        }
        return chunk;
    };

    for (const word of words) {
        const next = current ? `${current} ${word}` : `${indent}${word}`;
        if (measure(next) <= maxWidth) {
            current = next;
            continue;
        }
        if (current) lines.push(current);
        current = measure(word) > maxWidth ? breakWord(word) : word;
    }

    if (current) lines.push(current);
    return lines;
}

export function canEncodeWinAnsi(font, text) {
    try {
        font.encodeText(text);
        return true;
    } catch {
        return false;
    }
}

export function splitTextRuns(text, canEncode) {
    const runs = [];
    let current = "";
    let latin = null;

    for (const character of graphemes(text)) {
        const isLatin = canEncode(character);
        if (latin === null) {
            latin = isLatin;
            current = character;
            continue;
        }
        if (isLatin === latin) {
            current += character;
        } else {
            runs.push({ latin, text: current });
            latin = isLatin;
            current = character;
        }
    }

    if (current) runs.push({ latin, text: current });
    return runs;
}

function rasterMetrics(context, text, fontSize) {
    context.font = `${fontSize * RASTER_SCALE}px ${UNICODE_FONT}`;
    context.textBaseline = "alphabetic";
    const measured = context.measureText(text);
    const left = Math.max(0, measured.actualBoundingBoxLeft ?? 0);
    const right = Math.max(measured.width, measured.actualBoundingBoxRight ?? 0);
    const ascent = Math.max(fontSize * RASTER_SCALE * 0.8, measured.actualBoundingBoxAscent ?? 0);
    const descent = Math.max(fontSize * RASTER_SCALE * 0.2, measured.actualBoundingBoxDescent ?? 0);
    return {
        width: Math.max(1, Math.ceil(left + right) + RASTER_PADDING * 2),
        height: Math.max(1, Math.ceil(ascent + descent) + RASTER_PADDING * 2),
        x: left + RASTER_PADDING,
        baseline: ascent + RASTER_PADDING,
    };
}

function measureWidth(font, fontSize, text) {
    if (canEncodeWinAnsi(font, text)) return font.widthOfTextAtSize(text, fontSize);
    if (typeof document === "undefined") return text.length * fontSize * 0.6;
    const canvas = measureWidth.canvas ?? document.createElement("canvas");
    measureWidth.canvas = canvas;
    const context = canvas.getContext("2d");
    return rasterMetrics(context, text, fontSize).width / RASTER_SCALE;
}

async function rasterRun(pdf, text, fontSize) {
    if (typeof document === "undefined") {
        throw new Error("This text includes characters that need a browser font. Open the converter in a browser and try again.");
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const metrics = rasterMetrics(context, text, fontSize);
    canvas.width = metrics.width;
    canvas.height = metrics.height;
    context.font = `${fontSize * RASTER_SCALE}px ${UNICODE_FONT}`;
    context.fillStyle = "#111111";
    context.textBaseline = "alphabetic";
    context.fillText(text, metrics.x, metrics.baseline);

    const png = canvas.toDataURL("image/png");
    const bytes = Uint8Array.from(atob(png.split(",")[1]), (char) => char.charCodeAt(0));
    const image = await pdf.embedPng(bytes);
    return {
        image,
        width: canvas.width / RASTER_SCALE,
        height: canvas.height / RASTER_SCALE,
        baselineOffset: (canvas.height - metrics.baseline) / RASTER_SCALE,
    };
}

export async function writeTextPdf(text, { fontSize = 12 } = {}) {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const margin = 50;
    const lineHeight = fontSize * 1.4;
    const maxWidth = PAGE_WIDTH - margin * 2;
    const planned = planTextLayout(text, (line) => measureWidth(font, fontSize, line), maxWidth);

    let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - margin;

    const nextPage = () => {
        page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - margin;
    };

    for (const item of planned) {
        if (y < margin) nextPage();
        if (item.kind === "blank") {
            y -= lineHeight;
            continue;
        }

        let rowHeight = lineHeight;
        if (canEncodeWinAnsi(font, item.text)) {
            page.drawText(item.text, {
                x: margin,
                y,
                size: fontSize,
                font,
                color: rgb(0, 0, 0),
            });
        } else {
            // Keep a complete line together so the browser can shape combining
            // marks, joined emoji and bidirectional text in their full context.
            const raster = await rasterRun(pdf, item.text, fontSize);
            page.drawImage(raster.image, {
                x: margin,
                y: y - raster.baselineOffset,
                width: raster.width,
                height: raster.height,
            });
            rowHeight = Math.max(rowHeight, raster.height);
        }

        y -= rowHeight;
    }

    return pdf.save();
}

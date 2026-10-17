import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const UNICODE_FONT = '"Segoe UI", "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Noto Sans", sans-serif';

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
        for (const character of word) {
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

    for (const character of text) {
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

function measureWidth(font, fontSize, text) {
    if (canEncodeWinAnsi(font, text)) return font.widthOfTextAtSize(text, fontSize);
    if (typeof document === "undefined") return text.length * fontSize * 0.6;
    const canvas = measureWidth.canvas ?? document.createElement("canvas");
    measureWidth.canvas = canvas;
    const context = canvas.getContext("2d");
    context.font = `${fontSize}px ${UNICODE_FONT}`;
    return context.measureText(text).width;
}

async function rasterRun(pdf, text, fontSize) {
    if (typeof document === "undefined") {
        throw new Error("This text includes characters that need a browser font. Open the converter in a browser and try again.");
    }

    const scale = 2;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = `${fontSize * scale}px ${UNICODE_FONT}`;
    const measured = context.measureText(text);
    canvas.width = Math.max(1, Math.ceil(measured.width) + 4);
    canvas.height = Math.max(1, Math.ceil(fontSize * scale * 1.35));
    context.font = `${fontSize * scale}px ${UNICODE_FONT}`;
    context.fillStyle = "#111111";
    context.textBaseline = "top";
    context.fillText(text, 1, 1);

    const png = canvas.toDataURL("image/png");
    const bytes = Uint8Array.from(atob(png.split(",")[1]), (char) => char.charCodeAt(0));
    const image = await pdf.embedPng(bytes);
    return {
        image,
        width: canvas.width / scale,
        height: canvas.height / scale,
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

        let x = margin;
        const runs = splitTextRuns(item.text, (character) => canEncodeWinAnsi(font, character));
        let rowHeight = lineHeight;

        for (const run of runs) {
            if (run.latin) {
                page.drawText(run.text, {
                    x,
                    y,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0),
                });
                x += font.widthOfTextAtSize(run.text, fontSize);
            } else {
                const raster = await rasterRun(pdf, run.text, fontSize);
                page.drawImage(raster.image, {
                    x,
                    y: y - fontSize * 0.25,
                    width: raster.width,
                    height: raster.height,
                });
                x += raster.width;
                rowHeight = Math.max(rowHeight, raster.height);
            }
        }

        y -= rowHeight;
    }

    return pdf.save();
}

import mammoth from "mammoth";
import html2canvas from "html2canvas";
import { PDFDocument, StandardFonts, rgb } from "../_shared/pdfUtils";
import { readFileAsArrayBuffer, readFileAsText } from "../_shared/downloadUtils";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

export async function imageToPdf(file) {
    const bytes = new Uint8Array(await readFileAsArrayBuffer(file));
    const pdf = await PDFDocument.create();
    const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
    const image = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    return pdf.save();
}

export async function textToPdf(text) {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const margin = 50;
    const lineHeight = fontSize * 1.4;
    const maxWidth = A4_WIDTH - margin * 2;

    let page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
    let y = A4_HEIGHT - margin;
    const words = String(text).split(/\s+/);
    let line = "";

    const flush = (content) => {
        page.drawText(content, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
        y -= lineHeight;
        if (y < margin) {
            page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
            y = A4_HEIGHT - margin;
        }
    };

    for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);
        if (width > maxWidth && line) {
            flush(line);
            line = word;
        } else {
            line = testLine;
        }
    }

    if (line) flush(line);
    return pdf.save();
}

export async function htmlToPdf(html) {
    const wrapper = document.createElement("article");
    wrapper.style.width = "794px";
    wrapper.style.padding = "48px 56px";
    wrapper.style.background = "#ffffff";
    wrapper.style.color = "#111827";
    wrapper.style.fontFamily = '"IBM Plex Sans", Georgia, serif';
    wrapper.style.fontSize = "16px";
    wrapper.style.lineHeight = "1.6";
    wrapper.style.position = "fixed";
    wrapper.style.left = "-10000px";
    wrapper.style.top = "0";
    wrapper.style.zIndex = "-1";
    wrapper.innerHTML = `
        <style>
            article { color: #111827; }
            h1, h2, h3 { font-family: Georgia, serif; margin: 1.25em 0 0.5em; }
            p { margin: 0 0 0.9em; }
            ul, ol { margin: 0 0 1em 1.25em; }
            table { border-collapse: collapse; width: 100%; margin: 0 0 1em; }
            td, th { border: 1px solid #d1d5db; padding: 6px 8px; }
            img { max-width: 100%; height: auto; }
        </style>
        ${html}
    `;
    document.body.appendChild(wrapper);

    const canvas = await html2canvas(wrapper, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
    });
    document.body.removeChild(wrapper);

    const pdf = await PDFDocument.create();
    const ratio = A4_WIDTH / canvas.width;
    const sliceHeightPx = A4_HEIGHT / ratio;
    let y = 0;

    while (y < canvas.height) {
        const sliceH = Math.min(sliceHeightPx, canvas.height - y);
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = sliceH;
        const ctx = slice.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        const jpeg = slice.toDataURL("image/jpeg", 0.92);
        const bytes = Uint8Array.from(atob(jpeg.split(",")[1]), (c) => c.charCodeAt(0));
        const image = await pdf.embedJpg(bytes);
        const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
        page.drawImage(image, {
            x: 0,
            y: A4_HEIGHT - sliceH * ratio,
            width: A4_WIDTH,
            height: sliceH * ratio,
        });
        y += sliceHeightPx;
    }

    return pdf.save();
}

function odtToHtml(xml) {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const walk = (node) => {
        if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent ?? "");
        if (node.nodeType !== Node.ELEMENT_NODE) return "";
        const inner = Array.from(node.childNodes).map(walk).join("");
        switch (node.localName) {
            case "h":
                return `<h2>${inner}</h2>`;
            case "p":
                return `<p>${inner}</p>`;
            case "span":
                return `<span>${inner}</span>`;
            case "line-break":
                return "<br/>";
            case "s":
                return "&nbsp;".repeat(Number(node.getAttribute("text:c") || node.getAttribute("c") || 1));
            case "tab":
                return "&emsp;";
            case "list":
                return `<ul>${inner}</ul>`;
            case "list-item":
                return `<li>${inner}</li>`;
            case "table":
                return `<table>${inner}</table>`;
            case "table-row":
                return `<tr>${inner}</tr>`;
            case "table-cell":
                return `<td>${inner}</td>`;
            default:
                return inner;
        }
    };

    const body =
        doc.getElementsByTagName("office:body")[0] ||
        doc.getElementsByTagNameNS("urn:oasis:names:tc:opendocument:xmlns:office:1.0", "body")[0] ||
        doc.documentElement;
    return `<article>${walk(body)}</article>`;
}

function extractLegacyDocText(buffer) {
    const bytes = new Uint8Array(buffer);
    let text = "";
    for (let i = 0; i + 1 < bytes.length; i += 2) {
        const code = bytes[i] | (bytes[i + 1] << 8);
        if (code === 13 || code === 10) text += "\n";
        else if (code >= 32 && code < 127) text += String.fromCharCode(code);
        else text += " ";
    }
    return text.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export async function officeToPdf(file) {
    const buffer = await readFileAsArrayBuffer(file);
    const name = file.name.toLowerCase();

    if (name.endsWith(".docx") || file.type.includes("wordprocessingml")) {
        const { value } = await mammoth.convertToHtml({ arrayBuffer: buffer });
        return htmlToPdf(value || "<p>(Empty document)</p>");
    }

    if (name.endsWith(".odt") || file.type.includes("opendocument.text")) {
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(buffer);
        const xml = await zip.file("content.xml")?.async("string");
        if (!xml) throw new Error("This ODT file has no content.xml.");
        return htmlToPdf(odtToHtml(xml));
    }

    if (name.endsWith(".doc")) {
        try {
            const { value } = await mammoth.convertToHtml({ arrayBuffer: buffer });
            if (value?.trim()) return htmlToPdf(value);
        } catch {
            // Fall through to binary text extraction for legacy .doc
        }
        const text = extractLegacyDocText(buffer);
        if (!text) throw new Error("Could not read this .doc file. Save it as .docx and try again.");
        const html = text
            .split(/\n{2,}/)
            .map((paragraph) => `<p>${escapeHtml(paragraph.trim())}</p>`)
            .join("");
        return htmlToPdf(html);
    }

    throw new Error(`Unsupported Office file: ${file.name}`);
}

export async function fileToPdf(file) {
    const name = file.name.toLowerCase();
    if (file.type.startsWith("image/") || /\.(png|jpe?g|webp)$/.test(name)) {
        return imageToPdf(file);
    }
    if (file.type === "text/plain" || name.endsWith(".txt")) {
        return textToPdf(await readFileAsText(file));
    }
    if (/\.(docx?|odt)$/.test(name) || /word|opendocument/.test(file.type)) {
        return officeToPdf(file);
    }
    throw new Error(`Unsupported file type: ${file.name}`);
}

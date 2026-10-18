import mammoth from "mammoth";
import html2canvas from "html2canvas";
import { PDFDocument } from "../_shared/pdfUtils";
import { readFileAsArrayBuffer, readFileAsText } from "../_shared/downloadUtils";
import { writeTextPdf } from "../_shared/unicodeTextPdf";
import { imageEmbedPlan, legacyDocMessage } from "./imageEmbedPlan";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

async function decodeImageToPng(bytes, mimeType) {
    const blob = new Blob([bytes], { type: mimeType || "image/webp" });
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);
    bitmap.close?.();
    const png = canvas.toDataURL("image/png");
    return Uint8Array.from(atob(png.split(",")[1]), (char) => char.charCodeAt(0));
}

export async function imageToPdf(file) {
    const bytes = new Uint8Array(await readFileAsArrayBuffer(file));
    const pdf = await PDFDocument.create();
    const plan = imageEmbedPlan(file);
    const imageBytes = plan === "decode"
        ? await decodeImageToPng(bytes, file.type)
        : bytes;
    const image = plan === "jpeg"
        ? await pdf.embedJpg(imageBytes)
        : await pdf.embedPng(imageBytes);
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    return pdf.save();
}

export async function textToPdf(text) {
    return writeTextPdf(text);
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

export async function officeToPdf(file) {
    const unsupported = legacyDocMessage(file.name);
    if (unsupported) throw new Error(unsupported);

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

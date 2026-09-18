import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { downloadBytes } from "../_shared/downloadUtils";
import { getBaseName, readFileAsArrayBuffer, readFileAsText } from "../_shared/fileUtils";
import { PDFDocument, StandardFonts, rgb } from "../_shared/pdfUtils";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

async function imageFileToPdf(file) {
    const bytes = await readFileAsArrayBuffer(file);
    const pdf = await PDFDocument.create();
    const uint8 = new Uint8Array(bytes);

    let image;
    if (file.type === "image/png") image = await pdf.embedPng(uint8);
    else if (file.type === "image/webp" || file.type === "image/jpeg") {
        try {
            image = await pdf.embedJpg(uint8);
        } catch {
            const blob = new Blob([uint8], { type: file.type });
            const url = URL.createObjectURL(blob);
            const img = await new Promise((resolve, reject) => {
                const element = new Image();
                element.onload = () => resolve(element);
                element.onerror = reject;
                element.src = url;
            });
            URL.revokeObjectURL(url);
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext("2d").drawImage(img, 0, 0);
            const pngUrl = canvas.toDataURL("image/png");
            image = await pdf.embedPng(pngUrl);
            canvas.width = 0;
            canvas.height = 0;
        }
    } else {
        throw new Error(`Unsupported image type: ${file.type}`);
    }

    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    return pdf.save();
}

async function textFileToPdf(file) {
    const text = await readFileAsText(file);
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const margin = 50;
    const lineHeight = fontSize * 1.4;
    const pageWidth = 612;
    const pageHeight = 792;
    const maxWidth = pageWidth - margin * 2;

    const words = text.split(/\s+/);
    let page = pdf.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;
    let line = "";

    const flushLine = () => {
        if (!line.trim()) return;
        page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
        y -= lineHeight;
        line = "";
    };

    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        const width = font.widthOfTextAtSize(candidate, fontSize);
        if (width > maxWidth && line) {
            flushLine();
            if (y < margin) {
                page = pdf.addPage([pageWidth, pageHeight]);
                y = pageHeight - margin;
            }
            line = word;
        } else {
            line = candidate;
        }
    }
    flushLine();

    return pdf.save();
}

function ToPdf() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleFiles = async (files) => {
        const file = files[0];
        if (!file) return;
        setLoading(true);
        setError("");
        try {
            let bytes;
            if (file.type === "text/plain" || file.name.endsWith(".txt")) {
                bytes = await textFileToPdf(file);
            } else if (IMAGE_TYPES.includes(file.type)) {
                bytes = await imageFileToPdf(file);
            } else {
                throw new Error("Upload PNG, JPEG, WebP, or TXT files.");
            }
            downloadBytes(bytes, `${getBaseName(file.name)}.pdf`, "application/pdf");
        } catch (convertError) {
            setError(convertError instanceof Error ? convertError.message : "Conversion failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DocToolShell
            title="To PDF"
            description="Convert images or plain text files into PDF documents with automatic page sizing."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".png,.jpg,.jpeg,.webp,.txt,image/png,image/jpeg,image/webp,text/plain"
                    label="Drop an image or text file here"
                    hint="Supported: PNG, JPEG, WebP, TXT"
                    onFiles={handleFiles}
                    disabled={loading}
                />
                {loading ? <p className="doc-tool-status">Converting to PDF…</p> : null}
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default ToPdf;

import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { downloadBytes } from "../_shared/downloadUtils";
import { getBaseName, readFileAsArrayBuffer, readFileAsText } from "../_shared/fileUtils";
import { PDFDocument, StandardFonts, rgb } from "../_shared/pdfUtils";

async function imageToPdfPage(pdfDoc, file) {
    const bytes = await readFileAsArrayBuffer(file);
    const mime = file.type;
    const image = mime.includes("png")
        ? await pdfDoc.embedPng(bytes)
        : await pdfDoc.embedJpg(bytes);
    const { width, height } = image.scale(1);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
}

async function textToPdfPage(pdfDoc, text) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const margin = 48;
    const lineHeight = fontSize * 1.4;
    const pageWidth = 612;
    const pageHeight = 792;
    const maxWidth = pageWidth - margin * 2;
    const words = text.split(/\s+/);
    const lines = [];
    let current = "";

    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
            if (current) lines.push(current);
            current = word;
        } else {
            current = candidate;
        }
    }
    if (current) lines.push(current);

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;
    for (const line of lines) {
        if (y < margin) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
        }
        page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
        y -= lineHeight;
    }
}

function ToPdf() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const convert = async () => {
        setLoading(true);
        setError("");
        try {
            const pdfDoc = await PDFDocument.create();
            for (const file of files) {
                if (file.type.startsWith("image/")) {
                    await imageToPdfPage(pdfDoc, file);
                } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
                    const text = await readFileAsText(file);
                    await textToPdfPage(pdfDoc, text);
                } else {
                    throw new Error(`Unsupported file type: ${file.name}`);
                }
            }
            if (!pdfDoc.getPageCount()) throw new Error("No convertible files selected.");
            const bytes = await pdfDoc.save();
            const base = files.length === 1 ? getBaseName(files[0].name) : "converted";
            downloadBytes(bytes, `${base}.pdf`, "application/pdf");
        } catch (convertError) {
            setError(convertError instanceof Error ? convertError.message : "Conversion failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DocToolShell
            title="To PDF"
            description="Convert PNG, JPEG, WebP, or TXT files into a PDF with automatic page sizing."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".png,.jpg,.jpeg,.webp,.txt,image/*,text/plain"
                    multiple
                    label="Drop images or text files here"
                    hint="Supported: PNG, JPEG, WebP, TXT"
                    onFiles={(incoming) => setFiles((current) => [...current, ...incoming])}
                    disabled={loading}
                />
                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={convert}
                        disabled={!files.length || loading}
                    >
                        {loading ? "Converting…" : "Convert to PDF"}
                    </button>
                    <button
                        type="button"
                        className="doc-tool-button cursor-target"
                        onClick={() => setFiles([])}
                        disabled={!files.length || loading}
                    >
                        Clear
                    </button>
                </div>
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default ToPdf;

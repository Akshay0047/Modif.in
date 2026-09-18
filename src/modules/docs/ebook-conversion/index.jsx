import { useState } from "react";
import ePub from "epubjs";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { downloadBytes, downloadText } from "../_shared/downloadUtils";
import { getBaseName, readFileAsArrayBuffer } from "../_shared/fileUtils";
import { PDFDocument, StandardFonts, rgb } from "../_shared/pdfUtils";

async function extractEpubText(arrayBuffer) {
    const book = ePub(arrayBuffer);
    await book.ready;
    const sections = [];
    const spine = await book.loaded.spine;

    for (const item of spine.items) {
        const doc = await book.load(item.href);
        const text = doc?.documentElement?.textContent?.trim();
        if (text) sections.push(text);
    }

    book.destroy();
    return sections.join("\n\n");
}

async function textToPdf(text) {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.TimesRoman);
    const fontSize = 11;
    const margin = 50;
    const lineHeight = fontSize * 1.5;
    const pageWidth = 612;
    const pageHeight = 792;
    const maxWidth = pageWidth - margin * 2;

    const paragraphs = text.split(/\n{2,}/);
    let page = pdf.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    for (const paragraph of paragraphs) {
        const words = paragraph.split(/\s+/).filter(Boolean);
        let line = "";
        for (const word of words) {
            const candidate = line ? `${line} ${word}` : word;
            if (font.widthOfTextAtSize(candidate, fontSize) > maxWidth && line) {
                if (y < margin) {
                    page = pdf.addPage([pageWidth, pageHeight]);
                    y = pageHeight - margin;
                }
                page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
                y -= lineHeight;
                line = word;
            } else {
                line = candidate;
            }
        }
        if (line) {
            if (y < margin) {
                page = pdf.addPage([pageWidth, pageHeight]);
                y = pageHeight - margin;
            }
            page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
            y -= lineHeight * 1.5;
        }
    }

    return pdf.save();
}

function EbookConversion() {
    const [outputFormat, setOutputFormat] = useState("txt");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleFile = async (files) => {
        const file = files[0];
        if (!file) return;
        setLoading(true);
        setError("");
        try {
            const buffer = await readFileAsArrayBuffer(file);
            const text = await extractEpubText(buffer);
            const base = getBaseName(file.name);
            if (outputFormat === "txt") {
                downloadText(text, `${base}.txt`);
            } else {
                const bytes = await textToPdf(text);
                downloadBytes(bytes, `${base}.pdf`, "application/pdf");
            }
        } catch (convertError) {
            setError(convertError instanceof Error ? convertError.message : "E-book conversion failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DocToolShell
            title="E-Book Conversion"
            description="Extract text from EPUB files and export as plain text or a formatted PDF."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <div className="doc-tool-controls">
                    <button
                        type="button"
                        className={`doc-tool-button cursor-target${outputFormat === "txt" ? " is-active" : ""}`}
                        onClick={() => setOutputFormat("txt")}
                    >
                        Export TXT
                    </button>
                    <button
                        type="button"
                        className={`doc-tool-button cursor-target${outputFormat === "pdf" ? " is-active" : ""}`}
                        onClick={() => setOutputFormat("pdf")}
                    >
                        Export PDF
                    </button>
                </div>
                <FileDropZone
                    accept=".epub,application/epub+zip"
                    label="Drop an EPUB file here"
                    onFiles={handleFile}
                    disabled={loading}
                />
                {loading ? <p className="doc-tool-status">Extracting e-book content…</p> : null}
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default EbookConversion;

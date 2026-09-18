import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { downloadBytes, getBaseName, readFileAsArrayBuffer, readFileAsText } from "../_shared/downloadUtils";
import { PDFDocument, StandardFonts, rgb } from "../_shared/pdfUtils";

async function imageToPdf(file) {
    const bytes = new Uint8Array(await readFileAsArrayBuffer(file));
    const pdf = await PDFDocument.create();
    const isPng = file.type === "image/png";
    const image = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    return pdf.save();
}

async function textToPdf(file) {
    const text = await readFileAsText(file);
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const margin = 50;
    const lineHeight = fontSize * 1.4;
    const pageWidth = 595;
    const pageHeight = 842;
    const maxWidth = pageWidth - margin * 2;

    let page = pdf.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;
    const words = text.split(/\s+/);
    let line = "";

    for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);
        if (width > maxWidth && line) {
            page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
            y -= lineHeight;
            line = word;
            if (y < margin) {
                page = pdf.addPage([pageWidth, pageHeight]);
                y = pageHeight - margin;
            }
        } else {
            line = testLine;
        }
    }

    if (line) {
        page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
    }

    return pdf.save();
}

function ToPdf() {
    const [files, setFiles] = useState([]);
    const [status, setStatus] = useState("");
    const [running, setRunning] = useState(false);

    const handleConvert = async () => {
        if (!files.length) return;
        setRunning(true);
        setStatus("Converting to PDF…");

        try {
            for (const file of files) {
                let result;
                if (file.type.startsWith("image/")) {
                    result = await imageToPdf(file);
                } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
                    result = await textToPdf(file);
                } else {
                    throw new Error(`Unsupported file type: ${file.name}`);
                }
                downloadBytes(result, `${getBaseName(file.name)}.pdf`, "application/pdf");
            }
            setStatus(`${files.length} file(s) converted successfully.`);
        } catch (error) {
            setStatus(error?.message ?? "Conversion failed.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <DocToolShell
            title="To PDF"
            description="Convert PNG, JPEG, WebP, or TXT files into PDF documents."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".png,.jpg,.jpeg,.webp,.txt,image/*,text/plain"
                    multiple
                    files={files}
                    onFiles={setFiles}
                    label="Drop images or text files"
                />
                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={handleConvert}
                        disabled={running || !files.length}
                    >
                        Convert to PDF
                    </button>
                </div>
                {status ? <p className="doc-tool-status">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default ToPdf;

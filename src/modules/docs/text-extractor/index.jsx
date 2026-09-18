import { useState } from "react";
import mammoth from "mammoth";
import BackButton from "../../../components/BackButton";
import CopyButton from "../../text/_shared/CopyButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { extractAllText, loadPdfWithPdfJs } from "../_shared/pdfUtils";

async function extractDocxText(buffer) {
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value;
}

function TextExtractor() {
    const [text, setText] = useState("");
    const [status, setStatus] = useState("");
    const [running, setRunning] = useState(false);

    const handleFile = async (files) => {
        const file = files[0];
        if (!file) {
            setText("");
            return;
        }

        setRunning(true);
        setStatus("Extracting text…");

        try {
            const buffer = await readFileAsArrayBuffer(file);
            let extracted;

            if (file.name.endsWith(".pdf") || file.type === "application/pdf") {
                const pdf = await loadPdfWithPdfJs(buffer);
                extracted = await extractAllText(pdf);
                pdf.destroy();
            } else if (
                file.name.endsWith(".docx") ||
                file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ) {
                extracted = await extractDocxText(buffer);
            } else {
                throw new Error("Unsupported format. Use PDF or DOCX.");
            }

            setText(extracted);
            setStatus(`Extracted ${extracted.length.toLocaleString()} characters.`);
        } catch (error) {
            setStatus(error?.message ?? "Extraction failed.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <DocToolShell
            title="Text Extractor"
            description="Extract plain text from PDF and Word documents."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onFiles={handleFile}
                    label="Drop a PDF or DOCX file"
                />
                {running ? <p className="doc-tool-status">Processing…</p> : null}
            </div>

            {text ? (
                <div className="doc-tool-panel">
                    <div className="doc-tool-output-header">
                        <h2 className="doc-tool-section-title">Extracted Text</h2>
                        <CopyButton text={text} />
                    </div>
                    <textarea className="doc-tool-textarea" value={text} readOnly />
                </div>
            ) : null}

            {status && !running ? <p className="doc-tool-status">{status}</p> : null}
        </DocToolShell>
    );
}

export default TextExtractor;

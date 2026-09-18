import { useState } from "react";
import mammoth from "mammoth";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { downloadText } from "../_shared/downloadUtils";
import { getBaseName, readFileAsArrayBuffer } from "../_shared/fileUtils";
import { extractTextFromPdf } from "../_shared/pdfUtils";

function TextExtractor() {
    const [text, setText] = useState("");
    const [filename, setFilename] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    const handleFile = async (files) => {
        const file = files[0];
        if (!file) return;
        setLoading(true);
        setError("");
        setCopied(false);
        try {
            const buffer = await readFileAsArrayBuffer(file);
            let extracted = "";
            if (file.name.endsWith(".pdf") || file.type === "application/pdf") {
                const { pages } = await extractTextFromPdf(buffer);
                extracted = pages.map((page) => `--- Page ${page.pageNum} ---\n${page.text}`).join("\n\n");
            } else if (file.name.endsWith(".docx")) {
                const result = await mammoth.extractRawText({ arrayBuffer: buffer });
                extracted = result.value;
            } else {
                throw new Error("Upload a PDF or DOCX file.");
            }
            setText(extracted);
            setFilename(getBaseName(file.name));
        } catch (extractError) {
            setError(extractError instanceof Error ? extractError.message : "Extraction failed.");
            setText("");
        } finally {
            setLoading(false);
        }
    };

    const copyText = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
    };

    return (
        <DocToolShell
            title="Text Extractor"
            description="Extract plain text from PDF and Word documents with one-click copy."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    label="Drop a PDF or DOCX file here"
                    onFiles={handleFile}
                    disabled={loading}
                />

                {text ? (
                    <>
                        <div className="doc-tool-output-header" style={{ marginTop: "1rem" }}>
                            <h2 className="doc-tool-section-title">Extracted text</h2>
                            <div className="doc-tool-controls" style={{ marginBottom: 0 }}>
                                <button type="button" className="doc-tool-button cursor-target" onClick={copyText}>
                                    {copied ? "Copied!" : "Copy text"}
                                </button>
                                <button
                                    type="button"
                                    className="doc-tool-button doc-tool-button--primary cursor-target"
                                    onClick={() => downloadText(text, `${filename}.txt`)}
                                >
                                    Download TXT
                                </button>
                            </div>
                        </div>
                        <textarea className="doc-tool-textarea" value={text} readOnly />
                    </>
                ) : null}

                {loading ? <p className="doc-tool-status">Extracting text…</p> : null}
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default TextExtractor;

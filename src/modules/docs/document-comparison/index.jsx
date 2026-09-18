import { useState } from "react";
import { diffLines } from "diff";
import { html as diff2html } from "diff2html";
import mammoth from "mammoth";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { extractAllText, loadPdfWithPdfJs } from "../_shared/pdfUtils";
import "diff2html/bundles/css/diff2html.min.css";

async function extractText(file) {
    const buffer = await readFileAsArrayBuffer(file);
    if (file.name.endsWith(".pdf") || file.type === "application/pdf") {
        const pdf = await loadPdfWithPdfJs(buffer);
        const text = await extractAllText(pdf);
        pdf.destroy();
        return text;
    }
    if (file.name.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        return result.value;
    }
    return file.text();
}

function DocumentComparison() {
    const [fileA, setFileA] = useState(null);
    const [fileB, setFileB] = useState(null);
    const [diffHtml, setDiffHtml] = useState("");
    const [status, setStatus] = useState("");
    const [running, setRunning] = useState(false);

    const handleCompare = async () => {
        if (!fileA || !fileB) return;
        setRunning(true);
        setStatus("Extracting and comparing…");

        try {
            const [textA, textB] = await Promise.all([
                extractText(fileA),
                extractText(fileB),
            ]);
            const diff = diffLines(textA, textB);
            const html = diff2html(diff, {
                drawFileList: false,
                matching: "lines",
                outputFormat: "side-by-side",
            });
            setDiffHtml(html);
            setStatus("Comparison complete.");
        } catch (error) {
            setStatus(error?.message ?? "Comparison failed.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <DocToolShell
            title="Document Comparison"
            description="Compare two PDF or DOCX documents side-by-side with highlighted differences."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <div className="doc-tool-split">
                    <div>
                        <label className="doc-tool-label">Document A</label>
                        <FileDropZone
                            accept=".pdf,.docx,application/pdf"
                            files={fileA ? [fileA] : []}
                            onFiles={(files) => setFileA(files[0] ?? null)}
                            label="Drop first document"
                        />
                    </div>
                    <div>
                        <label className="doc-tool-label">Document B</label>
                        <FileDropZone
                            accept=".pdf,.docx,application/pdf"
                            files={fileB ? [fileB] : []}
                            onFiles={(files) => setFileB(files[0] ?? null)}
                            label="Drop second document"
                        />
                    </div>
                </div>

                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={handleCompare}
                        disabled={running || !fileA || !fileB}
                    >
                        Compare Documents
                    </button>
                </div>
            </div>

            {diffHtml ? (
                <div
                    className="doc-tool-panel"
                    dangerouslySetInnerHTML={{ __html: diffHtml }}
                />
            ) : null}

            {status ? <p className="doc-tool-status">{status}</p> : null}
        </DocToolShell>
    );
}

export default DocumentComparison;

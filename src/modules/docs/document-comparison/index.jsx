import { useEffect, useState } from "react";
import { createTwoFilesPatch } from "diff";
import { parse, html } from "diff2html";
import mammoth from "mammoth";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { readFileAsArrayBuffer, readFileAsText } from "../_shared/fileUtils";
import { extractTextFromPdf } from "../_shared/pdfUtils";
import "diff2html/bundles/css/diff2html.min.css";

async function extractDocumentText(file) {
    if (file.name.endsWith(".pdf") || file.type === "application/pdf") {
        const buffer = await readFileAsArrayBuffer(file);
        const { pages } = await extractTextFromPdf(buffer);
        return pages.map((page) => page.text).join("\n");
    }
    if (file.name.endsWith(".docx")) {
        const buffer = await readFileAsArrayBuffer(file);
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        return result.value;
    }
    if (file.name.endsWith(".txt") || file.type === "text/plain") {
        return readFileAsText(file);
    }
    throw new Error("Upload PDF, DOCX, or TXT files.");
}

function DocumentComparison() {
    const [leftFile, setLeftFile] = useState(null);
    const [rightFile, setRightFile] = useState(null);
    const [viewMode, setViewMode] = useState("side-by-side");
    const [diffHtml, setDiffHtml] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!leftFile || !rightFile) return undefined;
        let cancelled = false;

        (async () => {
            setLoading(true);
            setError("");
            try {
                const [leftText, rightText] = await Promise.all([
                    extractDocumentText(leftFile),
                    extractDocumentText(rightFile),
                ]);
                if (cancelled) return;
                const patch = createTwoFilesPatch(
                    leftFile.name,
                    rightFile.name,
                    leftText,
                    rightText,
                );
                const diffJson = parse(patch);
                setDiffHtml(
                    html(diffJson, {
                        drawFileList: false,
                        matching: "lines",
                        outputFormat: viewMode,
                    }),
                );
            } catch (compareError) {
                if (!cancelled) {
                    setError(compareError instanceof Error ? compareError.message : "Comparison failed.");
                    setDiffHtml("");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [leftFile, rightFile, viewMode]);

    return (
        <DocToolShell
            title="Document Comparison"
            description="Compare text extracted from two documents with side-by-side or inline highlighted diffs."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <div className="doc-tool-grid doc-tool-grid--2">
                    <div>
                        <h2 className="doc-tool-section-title">Original</h2>
                        <FileDropZone
                            accept=".pdf,.docx,.txt,application/pdf,text/plain"
                            label="Drop original document"
                            onFiles={(files) => setLeftFile(files[0] ?? null)}
                        />
                        {leftFile ? <p className="doc-tool-status">{leftFile.name}</p> : null}
                    </div>
                    <div>
                        <h2 className="doc-tool-section-title">Revised</h2>
                        <FileDropZone
                            accept=".pdf,.docx,.txt,application/pdf,text/plain"
                            label="Drop revised document"
                            onFiles={(files) => setRightFile(files[0] ?? null)}
                        />
                        {rightFile ? <p className="doc-tool-status">{rightFile.name}</p> : null}
                    </div>
                </div>

                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className={`doc-tool-button cursor-target${viewMode === "side-by-side" ? " is-active" : ""}`}
                        onClick={() => setViewMode("side-by-side")}
                    >
                        Side by side
                    </button>
                    <button
                        type="button"
                        className={`doc-tool-button cursor-target${viewMode === "line-by-line" ? " is-active" : ""}`}
                        onClick={() => setViewMode("line-by-line")}
                    >
                        Inline
                    </button>
                </div>

                {loading ? <p className="doc-tool-status">Comparing documents…</p> : null}
                {diffHtml ? (
                    <div
                        className="doc-tool-panel"
                        style={{ marginTop: "1rem", overflowX: "auto" }}
                        dangerouslySetInnerHTML={{ __html: diffHtml }}
                    />
                ) : null}
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default DocumentComparison;

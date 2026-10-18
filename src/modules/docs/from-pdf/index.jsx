import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import ProgressBar from "../_shared/ProgressBar";
import { downloadBlob, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { extractAllText, loadPdfWithPdfJs, renderPageToCanvas } from "../_shared/pdfUtils";

function pageItemsToMarkdown(items) {
    const sorted = [...items].sort((a, b) => {
        const ay = a.transform?.[5] ?? 0;
        const by = b.transform?.[5] ?? 0;
        if (Math.abs(by - ay) > 3) return by - ay;
        return (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0);
    });

    const lines = [];
    let current = [];
    let lastY = null;

    for (const item of sorted) {
        const y = item.transform?.[5] ?? 0;
        if (lastY != null && Math.abs(lastY - y) > Math.max(4, (item.height ?? 10) * 0.6)) {
            lines.push(current);
            current = [];
        }
        current.push(item);
        lastY = y;
    }
    if (current.length) lines.push(current);

    const blocks = [];
    for (const line of lines) {
        const text = line.map((item) => item.str).join("").replace(/\s+/g, " ").trim();
        if (!text) continue;
        const avgHeight = line.reduce((sum, item) => sum + (item.height || 0), 0) / line.length;
        const indent = Math.min(...line.map((item) => item.transform?.[4] ?? 0));
        blocks.push({ text, avgHeight, indent });
    }

    const heights = blocks.map((block) => block.avgHeight).sort((a, b) => a - b);
    const median = heights[Math.floor(heights.length / 2)] || 12;

    return blocks.map((block, index) => {
        const { text, avgHeight, indent } = block;
        const next = blocks[index + 1];
        if (avgHeight >= median * 1.45 || (text === text.toUpperCase() && /[A-Z]/.test(text) && text.length < 90)) {
            return `## ${text}`;
        }
        if (avgHeight >= median * 1.2 && text.length < 120) {
            return `### ${text}`;
        }
        if (/^([•●○\-–—*]|(\d+[.)]))/.test(text)) {
            return `- ${text.replace(/^([•●○\-–—*]|(\d+[.)]))\s*/, "")}`;
        }
        if (indent > 72 && next) {
            return `> ${text}`;
        }
        return text;
    }).join("\n\n");
}

async function extractMarkdown(pdf) {
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i += 1) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const markdown = pageItemsToMarkdown(content.items);
        page.cleanup();
        pages.push(`# Page ${i}\n\n${markdown || "_No extractable text on this page._"}`);
    }
    return pages.join("\n\n---\n\n");
}

function FromPdf() {
    const [file, setFile] = useState(null);
    const [mode, setMode] = useState("images");
    const [format, setFormat] = useState("png");
    const [scale, setScale] = useState(2);
    const [status, setStatus] = useState("");
    const [progress, setProgress] = useState(0);
    const [running, setRunning] = useState(false);

    const handleFile = (files) => setFile(files[0] ?? null);

    const handleConvert = async () => {
        if (!file) return;
        setRunning(true);
        setProgress(0);
        setStatus("Processing PDF…");

        try {
            const buffer = await readFileAsArrayBuffer(file);
            const pdf = await loadPdfWithPdfJs(buffer);

            if (mode === "text") {
                const text = await extractAllText(pdf);
                pdf.destroy();
                const blob = new Blob([text], { type: "text/plain" });
                downloadBlob(blob, `${getBaseName(file.name)}.txt`);
            } else if (mode === "markdown") {
                const markdown = await extractMarkdown(pdf);
                pdf.destroy();
                const blob = new Blob([markdown], { type: "text/markdown" });
                downloadBlob(blob, `${getBaseName(file.name)}.md`);
            } else {
                const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
                for (let i = 1; i <= pdf.numPages; i += 1) {
                    const canvas = await renderPageToCanvas(pdf, i, scale);
                    const blob = await new Promise((resolve) =>
                        canvas.toBlob(resolve, mimeType, 0.92),
                    );
                    downloadBlob(blob, `${getBaseName(file.name)}-page-${i}.${format}`);
                    canvas.width = 0;
                    canvas.height = 0;
                    setProgress((i / pdf.numPages) * 100);
                }
                pdf.destroy();
            }

            setStatus("Conversion complete.");
        } catch (error) {
            setStatus(error?.message ?? "Conversion failed.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <DocToolShell
            title="From PDF"
            description="Extract text, refined Markdown, or high-resolution page images from PDF files."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    files={file ? [file] : []}
                    onFiles={handleFile}
                    label="Drop a PDF file"
                />

                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    {[
                        ["images", "To Images"],
                        ["text", "To Text"],
                        ["markdown", "To Markdown"],
                    ].map(([id, label]) => (
                        <button
                            key={id}
                            type="button"
                            className={`doc-tool-button cursor-target${mode === id ? " is-active" : ""}`}
                            onClick={() => setMode(id)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {mode === "images" ? (
                    <div className="doc-tool-grid doc-tool-grid--2" style={{ marginTop: "1rem" }}>
                        <div>
                            <label className="doc-tool-label" htmlFor="from-pdf-format">Format</label>
                            <select
                                id="from-pdf-format"
                                className="doc-tool-select cursor-target"
                                value={format}
                                onChange={(e) => setFormat(e.target.value)}
                            >
                                <option value="png">PNG</option>
                                <option value="jpeg">JPEG</option>
                            </select>
                        </div>
                        <div>
                            <label className="doc-tool-label" htmlFor="from-pdf-scale">Resolution scale</label>
                            <input
                                id="from-pdf-scale"
                                className="doc-tool-range cursor-target"
                                type="range"
                                min="1"
                                max="4"
                                step="0.5"
                                value={scale}
                                aria-describedby="from-pdf-scale-help"
                                onChange={(e) => setScale(Number(e.target.value))}
                            />
                            <div className="doc-tool-range-meta" id="from-pdf-scale-help">
                                <span>1x</span>
                                <span>{scale}x</span>
                                <span>4x</span>
                            </div>
                        </div>
                    </div>
                ) : null}

                {running ? <ProgressBar value={progress} /> : null}

                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={handleConvert}
                        disabled={running || !file}
                    >
                        Convert
                    </button>
                </div>
                {status ? <p className="doc-tool-status">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default FromPdf;

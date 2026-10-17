import { useEffect, useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { extractPages, loadPdfWithPdfJs, renderPageToDataUrl } from "../_shared/pdfUtils";

function PdfSplitter() {
    const [file, setFile] = useState(null);
    const [buffer, setBuffer] = useState(null);
    const [pageCount, setPageCount] = useState(0);
    const [selected, setSelected] = useState(new Set());
    const [thumbnails, setThumbnails] = useState([]);
    const [rangeInput, setRangeInput] = useState("1");
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!buffer) return undefined;
        let cancelled = false;

        (async () => {
            setLoading(true);
            try {
                const pdf = await loadPdfWithPdfJs(buffer);
                if (cancelled) return;
                setPageCount(pdf.numPages);
                setSelected(new Set([0]));

                const thumbs = [];
                for (let i = 1; i <= pdf.numPages; i += 1) {
                    thumbs.push(await renderPageToDataUrl(pdf, i, 0.4));
                    if (cancelled) return;
                }
                pdf.destroy();
                setThumbnails(thumbs);
                setLoading(false);
            } catch (error) {
                if (cancelled) return;
                setThumbnails([]);
                setPageCount(0);
                setSelected(new Set());
                setLoading(false);
                setStatus(error?.message || "Could not read this PDF. Choose another file.");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [buffer]);

    const handleFile = async (files) => {
        const next = files[0] ?? null;
        setFile(next);
        setThumbnails([]);
        setStatus("");
        if (!next) {
            setBuffer(null);
            return;
        }
        setBuffer(await readFileAsArrayBuffer(next));
    };

    const togglePage = (index) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const applyRange = () => {
        const indices = new Set();
        rangeInput.split(",").forEach((part) => {
            const trimmed = part.trim();
            if (trimmed.includes("-")) {
                const [start, end] = trimmed.split("-").map(Number);
                for (let i = start; i <= (end || start); i += 1) {
                    if (i >= 1 && i <= pageCount) indices.add(i - 1);
                }
            } else {
                const num = Number(trimmed);
                if (num >= 1 && num <= pageCount) indices.add(num - 1);
            }
        });
        setSelected(indices);
    };

    const handleSplit = async () => {
        if (!buffer || !file || selected.size === 0) return;
        setStatus("Extracting pages…");
        try {
            const indices = [...selected].sort((a, b) => a - b);
            const result = await extractPages(buffer, indices);
            downloadBytes(
                result,
                `${getBaseName(file.name)}-pages.pdf`,
                "application/pdf",
            );
            setStatus("Split PDF downloaded successfully.");
        } catch (error) {
            setStatus(error?.message ?? "Failed to split PDF.");
        }
    };

    return (
        <DocToolShell
            title="PDF Splitter"
            description="Preview pages and extract selected ranges into a new PDF."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    files={file ? [file] : []}
                    onFiles={handleFile}
                    label="Drop a PDF file"
                />

                {pageCount > 0 ? (
                    <>
                        <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                            <input
                                className="doc-tool-input"
                                value={rangeInput}
                                onChange={(e) => setRangeInput(e.target.value)}
                                placeholder="e.g. 1-3, 5, 8"
                            />
                            <button
                                type="button"
                                className="doc-tool-button cursor-target"
                                onClick={applyRange}
                            >
                                Apply Range
                            </button>
                            <button
                                type="button"
                                className="doc-tool-button doc-tool-button--primary cursor-target"
                                onClick={handleSplit}
                                disabled={selected.size === 0}
                            >
                                Extract {selected.size} Page(s)
                            </button>
                        </div>

                        {loading ? <p className="doc-tool-status">Loading previews…</p> : null}

                        <div className="doc-tool-page-grid">
                            {thumbnails.map((src, index) => (
                                <div
                                    key={index}
                                    className={`doc-tool-page-thumb cursor-target${selected.has(index) ? " is-selected" : ""}`}
                                    onClick={() => togglePage(index)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") togglePage(index);
                                    }}
                                >
                                    <img src={src} alt={`Page ${index + 1}`} />
                                    <span className="doc-tool-page-thumb__label">
                                        Page {index + 1}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : null}

                {status ? <p className="doc-tool-status doc-tool-status--success">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default PdfSplitter;

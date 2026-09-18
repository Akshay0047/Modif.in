import { useEffect, useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import PdfPageGrid from "../_shared/components/PdfPageGrid";
import { downloadBytes } from "../_shared/downloadUtils";
import { getBaseName, readFileAsArrayBuffer, replaceExtension } from "../_shared/fileUtils";
import {
    copyPagesToNewPdf,
    loadPdfJsDocument,
    loadPdfLibDocument,
    parsePageRange,
} from "../_shared/pdfUtils";

function PdfSplitter() {
    const [file, setFile] = useState(null);
    const [pdfJsDoc, setPdfJsDoc] = useState(null);
    const [totalPages, setTotalPages] = useState(0);
    const [selectedPages, setSelectedPages] = useState(new Set());
    const [rangeInput, setRangeInput] = useState("");
    const [mode, setMode] = useState("visual");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [sourceBuffer, setSourceBuffer] = useState(null);

    useEffect(() => {
        if (!file) return undefined;
        let cancelled = false;

        (async () => {
            setLoading(true);
            setError("");
            try {
                const buffer = await readFileAsArrayBuffer(file);
                if (cancelled) return;
                const doc = await loadPdfJsDocument(buffer);
                if (cancelled) return;
                setSourceBuffer(buffer);
                setPdfJsDoc(doc);
                setTotalPages(doc.numPages);
                setSelectedPages(new Set());
            } catch (loadError) {
                if (!cancelled) {
                    setError(loadError instanceof Error ? loadError.message : "Failed to load PDF.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [file]);

    const togglePage = (pageIndex) => {
        setSelectedPages((current) => {
            const next = new Set(current);
            if (next.has(pageIndex)) next.delete(pageIndex);
            else next.add(pageIndex);
            return next;
        });
    };

    const applyRange = () => {
        try {
            const indices = parsePageRange(rangeInput, totalPages);
            setSelectedPages(new Set(indices));
            setError("");
        } catch (rangeError) {
            setError(rangeError instanceof Error ? rangeError.message : "Invalid page range.");
        }
    };

    const extractPages = async () => {
        if (!sourceBuffer) return;
        setLoading(true);
        setError("");
        try {
            const indices = Array.from(selectedPages).sort((a, b) => a - b);
            if (!indices.length) throw new Error("Select at least one page.");

            const sourcePdf = await loadPdfLibDocument(sourceBuffer);
            const output = await copyPagesToNewPdf(sourcePdf, indices);
            const bytes = await output.save();
            const filename = replaceExtension(file.name, "-extracted.pdf");
            downloadBytes(bytes, filename, "application/pdf");
        } catch (extractError) {
            setError(extractError instanceof Error ? extractError.message : "Failed to extract pages.");
        } finally {
            setLoading(false);
        }
    };

    const extractEachPage = async () => {
        if (!sourceBuffer || !file) return;
        setLoading(true);
        setError("");
        try {
            const sourcePdf = await loadPdfLibDocument(sourceBuffer);
            const base = getBaseName(file.name);
            for (let index = 0; index < sourcePdf.getPageCount(); index += 1) {
                const output = await copyPagesToNewPdf(sourcePdf, [index]);
                const bytes = await output.save();
                downloadBytes(bytes, `${base}-page-${index + 1}.pdf`, "application/pdf");
            }
        } catch (splitError) {
            setError(splitError instanceof Error ? splitError.message : "Failed to split PDF.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DocToolShell
            title="PDF Splitter"
            description="Preview pages visually or enter ranges, then extract selected pages into a new PDF."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    label="Drop a PDF file here or click to browse"
                    onFiles={(files) => setFile(files[0] ?? null)}
                    disabled={loading}
                />

                {file ? <p className="doc-tool-status">Loaded: {file.name} ({totalPages} pages)</p> : null}

                {pdfJsDoc ? (
                    <>
                        <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                            <button
                                type="button"
                                className={`doc-tool-button cursor-target${mode === "visual" ? " is-active" : ""}`}
                                onClick={() => setMode("visual")}
                            >
                                Visual selection
                            </button>
                            <button
                                type="button"
                                className={`doc-tool-button cursor-target${mode === "range" ? " is-active" : ""}`}
                                onClick={() => setMode("range")}
                            >
                                Page ranges
                            </button>
                        </div>

                        {mode === "visual" ? (
                            <PdfPageGrid
                                pdfDoc={pdfJsDoc}
                                totalPages={totalPages}
                                selectedPages={selectedPages}
                                onTogglePage={togglePage}
                            />
                        ) : (
                            <div style={{ marginTop: "1rem" }}>
                                <label className="doc-tool-label" htmlFor="page-range">
                                    Page ranges (e.g. 1-3,5,8-10)
                                </label>
                                <input
                                    id="page-range"
                                    className="doc-tool-input"
                                    value={rangeInput}
                                    onChange={(event) => setRangeInput(event.target.value)}
                                    placeholder="1-3,5,7"
                                />
                                <div className="doc-tool-controls">
                                    <button
                                        type="button"
                                        className="doc-tool-button cursor-target"
                                        onClick={applyRange}
                                    >
                                        Apply range
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="doc-tool-controls">
                            <button
                                type="button"
                                className="doc-tool-button doc-tool-button--primary cursor-target"
                                onClick={extractPages}
                                disabled={loading || !selectedPages.size}
                            >
                                Extract selected pages
                            </button>
                            <button
                                type="button"
                                className="doc-tool-button cursor-target"
                                onClick={extractEachPage}
                                disabled={loading}
                            >
                                Split into individual PDFs
                            </button>
                        </div>
                    </>
                ) : null}

                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default PdfSplitter;

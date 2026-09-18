import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { downloadBytes } from "../_shared/downloadUtils";
import { readFileAsArrayBuffer, replaceExtension } from "../_shared/fileUtils";
import { loadPdfLibDocument, rgb, StandardFonts } from "../_shared/pdfUtils";

function PaginationLayout() {
    const [file, setFile] = useState(null);
    const [headerText, setHeaderText] = useState("");
    const [footerText, setFooterText] = useState("");
    const [showPageNumbers, setShowPageNumbers] = useState(true);
    const [margin, setMargin] = useState(36);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const apply = async () => {
        if (!file) return;
        setLoading(true);
        setError("");
        try {
            const buffer = await readFileAsArrayBuffer(file);
            const pdf = await loadPdfLibDocument(buffer);
            const pages = pdf.getPages();
            const font = await pdf.embedFont(StandardFonts.Helvetica);
            const total = pages.length;

            pages.forEach((page, index) => {
                const { height } = page.getSize();
                if (headerText) {
                    page.drawText(headerText, {
                        x: margin,
                        y: height - margin,
                        size: 10,
                        font,
                        color: rgb(0.2, 0.2, 0.2),
                    });
                }
                const footer = showPageNumbers
                    ? `${footerText ? `${footerText} · ` : ""}Page ${index + 1} of ${total}`
                    : footerText;
                if (footer) {
                    page.drawText(footer, {
                        x: margin,
                        y: margin / 2,
                        size: 10,
                        font,
                        color: rgb(0.2, 0.2, 0.2),
                    });
                }
            });

            const bytes = await pdf.save();
            downloadBytes(bytes, replaceExtension(file.name, "-paginated.pdf"), "application/pdf");
        } catch (layoutError) {
            setError(layoutError instanceof Error ? layoutError.message : "Pagination failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DocToolShell
            title="Pagination & Layout"
            description="Add headers, footers, and page numbers to every page in a PDF."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone accept=".pdf,application/pdf" label="Drop a PDF" onFiles={(files) => setFile(files[0] ?? null)} disabled={loading} />
                <div className="doc-tool-grid doc-tool-grid--2" style={{ marginTop: "1rem" }}>
                    <div>
                        <label className="doc-tool-label">Header text</label>
                        <input className="doc-tool-input cursor-target" value={headerText} onChange={(e) => setHeaderText(e.target.value)} />
                    </div>
                    <div>
                        <label className="doc-tool-label">Footer text</label>
                        <input className="doc-tool-input cursor-target" value={footerText} onChange={(e) => setFooterText(e.target.value)} />
                    </div>
                    <div>
                        <label className="doc-tool-label">Margin ({margin}px)</label>
                        <input className="doc-tool-range cursor-target" type="range" min="18" max="72" step="2" value={margin} onChange={(e) => setMargin(Number(e.target.value))} />
                    </div>
                    <label className="doc-tool-checkbox cursor-target">
                        <input type="checkbox" className="cursor-target" checked={showPageNumbers} onChange={(e) => setShowPageNumbers(e.target.checked)} />
                        Show page numbers
                    </label>
                </div>
                <div className="doc-tool-controls">
                    <button type="button" className="doc-tool-button doc-tool-button--primary cursor-target" onClick={apply} disabled={!file || loading}>
                        Apply layout
                    </button>
                </div>
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default PaginationLayout;

import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { addPageNumbers } from "../_shared/pdfUtils";

function PaginationLayout() {
    const [format, setFormat] = useState("Page {n} of {total}");
    const [fontSize, setFontSize] = useState(10);
    const [status, setStatus] = useState("");

    const handleApply = async (files) => {
        const file = files[0];
        if (!file) return;

        setStatus("Adding page numbers…");

        try {
            const buffer = await readFileAsArrayBuffer(file);
            const result = await addPageNumbers(buffer, { format, fontSize });
            downloadBytes(
                result,
                `${getBaseName(file.name)}-paginated.pdf`,
                "application/pdf",
            );
            setStatus("PDF with page numbers downloaded.");
        } catch (error) {
            setStatus(error?.message ?? "Failed to add page numbers.");
        }
    };

    return (
        <DocToolShell
            title="Pagination & Layout"
            description="Add custom headers, footers, and page numbers to every page."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    onFiles={handleApply}
                    label="Drop a PDF file"
                />

                <div className="doc-tool-grid doc-tool-grid--2" style={{ marginTop: "1rem" }}>
                    <div>
                        <label className="doc-tool-label">Page number format</label>
                        <input
                            className="doc-tool-input cursor-target"
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                            placeholder="Page {n} of {total}"
                        />
                    </div>
                    <div>
                        <label className="doc-tool-label">Font size ({fontSize}px)</label>
                        <input
                            className="doc-tool-range cursor-target"
                            type="range"
                            min="8"
                            max="24"
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                        />
                    </div>
                </div>

                {status ? <p className="doc-tool-status">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default PaginationLayout;

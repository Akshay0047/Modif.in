import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { downloadBytes } from "../_shared/downloadUtils";
import { readFileAsArrayBuffer, replaceExtension } from "../_shared/fileUtils";
import { loadPdfJsDocument, loadPdfLibDocument } from "../_shared/pdfUtils";
import { PDFDocument } from "pdf-lib";

async function repairPdf(buffer) {
    try {
        const pdf = await loadPdfLibDocument(buffer, { throwOnInvalidObject: false });
        return pdf.save({ useObjectStreams: false });
    } catch {
        const jsDoc = await loadPdfJsDocument(buffer);
        const output = await PDFDocument.create();
        for (let pageNum = 1; pageNum <= jsDoc.numPages; pageNum += 1) {
            const page = await jsDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
            const image = await output.embedPng(canvas.toDataURL("image/png"));
            const pdfPage = output.addPage([viewport.width, viewport.height]);
            pdfPage.drawImage(image, { x: 0, y: 0, width: viewport.width, height: viewport.height });
            canvas.width = 0;
            canvas.height = 0;
        }
        return output.save({ useObjectStreams: false });
    }
}

function RepairDocument() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");

    const repair = async () => {
        if (!file) return;
        setLoading(true);
        setError("");
        setStatus("Attempting structure rebuild…");
        try {
            const buffer = await readFileAsArrayBuffer(file);
            const bytes = await repairPdf(buffer);
            setStatus("Repair complete.");
            downloadBytes(bytes, replaceExtension(file.name, "-repaired.pdf"), "application/pdf");
        } catch (repairError) {
            setError(repairError instanceof Error ? repairError.message : "Could not repair this PDF.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DocToolShell
            title="Repair Document"
            description="Rebuild corrupted PDF cross-references or rasterize recoverable pages into a fresh container."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone accept=".pdf,application/pdf" label="Drop a potentially corrupted PDF" onFiles={(files) => setFile(files[0] ?? null)} disabled={loading} />
                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button type="button" className="doc-tool-button doc-tool-button--primary cursor-target" onClick={repair} disabled={!file || loading}>
                        {loading ? "Repairing…" : "Repair & Download"}
                    </button>
                </div>
                {status ? <p className="doc-tool-status">{status}</p> : null}
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default RepairDocument;

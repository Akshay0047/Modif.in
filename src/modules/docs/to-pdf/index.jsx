import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import PdfPreview from "../_shared/PdfPreview";
import { downloadBytes, getBaseName } from "../_shared/downloadUtils";
import { fileToPdf } from "./convert";

function ToPdf() {
    const [files, setFiles] = useState([]);
    const [status, setStatus] = useState("");
    const [running, setRunning] = useState(false);
    const [previews, setPreviews] = useState([]);

    const convertAll = async () => {
        const results = [];
        for (const file of files) {
            setStatus(`Converting ${file.name}…`);
            results.push({
                name: `${getBaseName(file.name)}.pdf`,
                bytes: await fileToPdf(file),
            });
        }
        return results;
    };

    const handlePreview = async () => {
        if (!files.length) return;
        setRunning(true);
        try {
            const results = await convertAll();
            setPreviews(results);
            setStatus("Preview ready. Refresh after changing files.");
        } catch (error) {
            setStatus(error?.message ?? "Conversion failed.");
        } finally {
            setRunning(false);
        }
    };

    const handleConvert = async () => {
        if (!files.length) return;
        setRunning(true);
        setStatus("Converting to PDF…");

        try {
            const results = previews.length === files.length ? previews : await convertAll();
            if (previews.length !== files.length) setPreviews(results);
            for (const result of results) {
                downloadBytes(result.bytes, result.name, "application/pdf");
            }
            setStatus(`${results.length} file(s) converted successfully.`);
        } catch (error) {
            setStatus(error?.message ?? "Conversion failed.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <DocToolShell
            title="To PDF"
            description="Convert PNG, JPEG, WebP, TXT, DOC, DOCX, and ODT files into PDF documents."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.odt,image/*,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text"
                    multiple
                    files={files}
                    onFiles={(next) => {
                        setFiles(next);
                        setPreviews([]);
                    }}
                    label="Drop images, text, Word, or ODT files"
                />
                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className="doc-tool-button cursor-target"
                        onClick={handlePreview}
                        disabled={running || !files.length}
                    >
                        {previews.length ? "Refresh Preview" : "Preview PDF"}
                    </button>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={handleConvert}
                        disabled={running || !files.length}
                    >
                        Save & Download
                    </button>
                </div>
                {status ? <p className="doc-tool-status">{status}</p> : null}
            </div>

            {previews.map((preview) => (
                <div className="doc-tool-panel" key={preview.name}>
                    <h2 className="doc-tool-section-title">{preview.name}</h2>
                    <PdfPreview bytes={preview.bytes} title={preview.name} />
                </div>
            ))}
        </DocToolShell>
    );
}

export default ToPdf;

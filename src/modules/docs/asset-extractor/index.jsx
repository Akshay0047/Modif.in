import { useState } from "react";
import JSZip from "jszip";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import ProgressBar from "../_shared/ProgressBar";
import { downloadBlob, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { loadPdfWithPdfJs, pdfjs, renderPageToCanvas } from "../_shared/pdfUtils";

function AssetExtractor() {
    const [status, setStatus] = useState("");
    const [progress, setProgress] = useState(0);
    const [running, setRunning] = useState(false);

    const handleFile = async (files) => {
        const file = files[0];
        if (!file) return;

        setRunning(true);
        setProgress(0);
        setStatus("Scanning PDF for embedded assets…");

        try {
            const buffer = await readFileAsArrayBuffer(file);
            const pdf = await loadPdfWithPdfJs(buffer);
            const zip = new JSZip();
            let assetCount = 0;

            for (let i = 1; i <= pdf.numPages; i += 1) {
                const page = await pdf.getPage(i);
                const ops = await page.getOperatorList();
                const objs = ops.fnArray
                    .map((fn, idx) => (fn === pdfjs.OPS.paintImageXObject ? ops.argsArray[idx][0] : null))
                    .filter(Boolean);

                for (const objName of objs) {
                    try {
                        const img = await page.objs.get(objName);
                        if (img?.data) {
                            const canvas = document.createElement("canvas");
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext("2d");
                            const imageData = ctx.createImageData(img.width, img.height);
                            imageData.data.set(img.data);
                            ctx.putImageData(imageData, 0, 0);
                            const blob = await new Promise((resolve) =>
                                canvas.toBlob(resolve, "image/png"),
                            );
                            zip.file(`page-${i}-asset-${assetCount + 1}.png`, blob);
                            assetCount += 1;
                            canvas.width = 0;
                            canvas.height = 0;
                        }
                    } catch {
                        // Skip unextractable objects
                    }
                }
                page.cleanup();
                setProgress((i / pdf.numPages) * 100);
            }

            if (assetCount === 0) {
                for (let i = 1; i <= pdf.numPages; i += 1) {
                    const canvas = await renderPageToCanvas(pdf, i, 2);
                    const blob = await new Promise((resolve) =>
                        canvas.toBlob(resolve, "image/png"),
                    );
                    zip.file(`page-${i}-render.png`, blob);
                    canvas.width = 0;
                    canvas.height = 0;
                    assetCount += 1;
                }
            }

            pdf.destroy();
            const zipBlob = await zip.generateAsync({ type: "blob" });
            downloadBlob(zipBlob, `${getBaseName(file.name)}-assets.zip`);
            setStatus(`Extracted ${assetCount} asset(s) into ZIP archive.`);
        } catch (error) {
            setStatus(error?.message ?? "Extraction failed.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <DocToolShell
            title="Asset Extractor"
            description="Scan PDFs for embedded images and package them into a ZIP archive."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    onFiles={handleFile}
                    label="Drop a PDF file"
                />
                {running ? <ProgressBar value={progress} label="Extracting assets…" /> : null}
                {status ? <p className="doc-tool-status">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default AssetExtractor;

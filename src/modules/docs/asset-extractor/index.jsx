import { useState } from "react";
import JSZip from "jszip";
import * as pdfjs from "pdfjs-dist";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import ProgressBar from "../_shared/components/ProgressBar";
import { downloadBlob } from "../_shared/downloadUtils";
import { getBaseName, readFileAsArrayBuffer } from "../_shared/fileUtils";
import { initPdfJs, loadPdfJsDocument } from "../_shared/pdfUtils";

async function extractImagesFromPdf(arrayBuffer, onProgress) {
    initPdfJs();
    const pdf = await loadPdfJsDocument(arrayBuffer);
    const zip = new JSZip();
    let imageCount = 0;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        onProgress?.(Math.round((pageNum / pdf.numPages) * 90), `Scanning page ${pageNum}`);
        const page = await pdf.getPage(pageNum);
        const operatorList = await page.getOperatorList();
        const { fnArray, argsArray } = operatorList;

        for (let index = 0; index < fnArray.length; index += 1) {
            const fn = fnArray[index];
            const args = argsArray[index];
            if (fn !== pdfjs.OPS.paintImageXObject && fn !== pdfjs.OPS.paintJpegXObject) continue;

            const imageName = args[0];
            try {
                const image = await page.objs.get(imageName);
                if (!image?.data) continue;
                const canvas = document.createElement("canvas");
                canvas.width = image.width;
                canvas.height = image.height;
                const context = canvas.getContext("2d");
                const imageData = context.createImageData(image.width, image.height);
                imageData.data.set(image.data);
                context.putImageData(imageData, 0, 0);
                const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
                if (blob) {
                    imageCount += 1;
                    zip.file(`page-${pageNum}-image-${imageCount}.png`, blob);
                }
                canvas.width = 0;
                canvas.height = 0;
            } catch {
                // Skip images that cannot be decoded.
            }
        }
    }

    onProgress?.(95, "Packaging ZIP archive");
    const archive = await zip.generateAsync({ type: "blob" });
    onProgress?.(100, "Done");
    return { archive, imageCount };
}

function AssetExtractor() {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");
    const [resultCount, setResultCount] = useState(null);

    const handleFile = async (files) => {
        const file = files[0];
        if (!file) return;
        setLoading(true);
        setError("");
        setResultCount(null);
        try {
            const buffer = await readFileAsArrayBuffer(file);
            const { archive, imageCount } = await extractImagesFromPdf(buffer, (value, label) => {
                setProgress(value);
                setStatus(label);
            });
            if (!imageCount) throw new Error("No embedded images found in this PDF.");
            downloadBlob(archive, `${getBaseName(file.name)}-assets.zip`);
            setResultCount(imageCount);
        } catch (extractError) {
            setError(extractError instanceof Error ? extractError.message : "Asset extraction failed.");
        } finally {
            setLoading(false);
            setProgress(0);
            setStatus("");
        }
    };

    return (
        <DocToolShell
            title="Asset Extractor"
            description="Scan PDF object streams for embedded images and download them as a ZIP archive."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    label="Drop a PDF to extract embedded images"
                    onFiles={handleFile}
                    disabled={loading}
                />
                {loading ? <ProgressBar value={progress} label={status || "Extracting assets…"} /> : null}
                {resultCount !== null ? (
                    <p className="doc-tool-status">Extracted {resultCount} image(s).</p>
                ) : null}
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default AssetExtractor;

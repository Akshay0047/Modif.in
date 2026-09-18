import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { downloadBytes } from "../_shared/downloadUtils";
import { readFileAsArrayBuffer, readFileAsDataUrl, replaceExtension } from "../_shared/fileUtils";
import { degrees, drawWatermark, loadPdfLibDocument, rgb } from "../_shared/pdfUtils";

function Watermarking() {
    const [file, setFile] = useState(null);
    const [text, setText] = useState("CONFIDENTIAL");
    const [opacity, setOpacity] = useState(0.2);
    const [angle, setAngle] = useState(-45);
    const [fontSize, setFontSize] = useState(48);
    const [tile, setTile] = useState(false);
    const [logoFile, setLogoFile] = useState(null);
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

            let logoImage = null;
            if (logoFile) {
                const dataUrl = await readFileAsDataUrl(logoFile);
                logoImage = logoFile.type.includes("png")
                    ? await pdf.embedPng(dataUrl)
                    : await pdf.embedJpg(dataUrl);
            }

            for (const page of pages) {
                if (text) {
                    await drawWatermark(page, pdf, text, {
                        fontSize,
                        opacity,
                        angle,
                        tile,
                        color: rgb(0.6, 0.5, 0.1),
                    });
                }
                if (logoImage) {
                    const { width, height } = page.getSize();
                    const logoWidth = width * 0.25;
                    const logoHeight = (logoImage.height / logoImage.width) * logoWidth;
                    page.drawImage(logoImage, {
                        x: width / 2 - logoWidth / 2,
                        y: height / 2 - logoHeight / 2,
                        width: logoWidth,
                        height: logoHeight,
                        opacity,
                    });
                }
            }

            const bytes = await pdf.save();
            downloadBytes(bytes, replaceExtension(file.name, "-watermarked.pdf"), "application/pdf");
        } catch (watermarkError) {
            setError(watermarkError instanceof Error ? watermarkError.message : "Watermarking failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DocToolShell
            title="Watermarking"
            description="Overlay customizable text or logo watermarks across all PDF pages."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone accept=".pdf,application/pdf" label="Drop a PDF" onFiles={(files) => setFile(files[0] ?? null)} disabled={loading} />
                <div className="doc-tool-grid doc-tool-grid--2" style={{ marginTop: "1rem" }}>
                    <div>
                        <label className="doc-tool-label">Watermark text</label>
                        <input className="doc-tool-input cursor-target" value={text} onChange={(e) => setText(e.target.value)} />
                    </div>
                    <div>
                        <label className="doc-tool-label">Logo image (optional)</label>
                        <input className="doc-tool-input cursor-target" type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
                    </div>
                    <div>
                        <label className="doc-tool-label">Opacity ({opacity})</label>
                        <input className="doc-tool-range cursor-target" type="range" min="0.05" max="1" step="0.05" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="doc-tool-label">Angle ({angle}°)</label>
                        <input className="doc-tool-range cursor-target" type="range" min="-90" max="90" step="5" value={angle} onChange={(e) => setAngle(Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="doc-tool-label">Font size ({fontSize})</label>
                        <input className="doc-tool-range cursor-target" type="range" min="12" max="96" step="2" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
                    </div>
                    <label className="doc-tool-checkbox cursor-target">
                        <input type="checkbox" className="cursor-target" checked={tile} onChange={(e) => setTile(e.target.checked)} />
                        Tile pattern
                    </label>
                </div>
                <div className="doc-tool-controls">
                    <button type="button" className="doc-tool-button doc-tool-button--primary cursor-target" onClick={apply} disabled={!file || loading}>
                        Apply watermark
                    </button>
                </div>
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default Watermarking;

import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import PdfPreview from "../_shared/PdfPreview";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { addWatermark, rgb } from "../_shared/pdfUtils";

function Watermarking() {
    const [file, setFile] = useState(null);
    const [text, setText] = useState("CONFIDENTIAL");
    const [opacity, setOpacity] = useState(0.3);
    const [fontSize, setFontSize] = useState(48);
    const [angle, setAngle] = useState(-45);
    const [tile, setTile] = useState(false);
    const [previewBytes, setPreviewBytes] = useState(null);
    const [status, setStatus] = useState("");
    const [running, setRunning] = useState(false);

    const buildWatermarked = async () => {
        const buffer = await readFileAsArrayBuffer(file);
        return addWatermark(buffer, {
            text,
            opacity,
            fontSize,
            angle,
            tile,
            color: rgb(0.5, 0.5, 0.5),
        });
    };

    const handlePreview = async () => {
        if (!file) return;
        setRunning(true);
        setStatus("Building watermark preview…");
        try {
            const result = await buildWatermarked();
            setPreviewBytes(result);
            setStatus("Preview ready. Edit the watermark and refresh if needed.");
        } catch (error) {
            setStatus(error?.message ?? "Watermarking failed.");
        } finally {
            setRunning(false);
        }
    };

    const handleDownload = async () => {
        if (!file) return;
        setRunning(true);
        setStatus("Saving watermarked PDF…");
        try {
            const result = await buildWatermarked();
            setPreviewBytes(result);
            downloadBytes(
                result,
                `${getBaseName(file.name)}-watermarked.pdf`,
                "application/pdf",
            );
            setStatus("Watermarked PDF downloaded.");
        } catch (error) {
            setStatus(error?.message ?? "Watermarking failed.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <DocToolShell
            title="Watermarking"
            description="Overlay customizable text watermarks onto every page of a PDF. Preview before you download."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    files={file ? [file] : []}
                    onFiles={(files) => {
                        setFile(files[0] ?? null);
                        setPreviewBytes(null);
                    }}
                    label="Drop a PDF file"
                />

                <div className="doc-tool-grid doc-tool-grid--2" style={{ marginTop: "1rem" }}>
                    <div>
                        <label className="doc-tool-label" htmlFor="watermark-text">Watermark text</label>
                        <input
                            id="watermark-text"
                            className="doc-tool-input cursor-target"
                            value={text}
                            onChange={(e) => {
                                setText(e.target.value);
                                setPreviewBytes(null);
                            }}
                        />
                    </div>
                    <div>
                        <label className="doc-tool-label" htmlFor="watermark-opacity">Opacity ({opacity})</label>
                        <input
                            id="watermark-opacity"
                            className="doc-tool-range cursor-target"
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.05"
                            value={opacity}
                            onChange={(e) => {
                                setOpacity(Number(e.target.value));
                                setPreviewBytes(null);
                            }}
                        />
                    </div>
                    <div>
                        <label className="doc-tool-label" htmlFor="watermark-font-size">Font size ({fontSize}px)</label>
                        <input
                            id="watermark-font-size"
                            className="doc-tool-range cursor-target"
                            type="range"
                            min="12"
                            max="120"
                            value={fontSize}
                            onChange={(e) => {
                                setFontSize(Number(e.target.value));
                                setPreviewBytes(null);
                            }}
                        />
                    </div>
                    <div>
                        <label className="doc-tool-label" htmlFor="watermark-angle">Angle ({angle}°)</label>
                        <input
                            id="watermark-angle"
                            className="doc-tool-range cursor-target"
                            type="range"
                            min="-90"
                            max="90"
                            value={angle}
                            onChange={(e) => {
                                setAngle(Number(e.target.value));
                                setPreviewBytes(null);
                            }}
                        />
                    </div>
                </div>

                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className={`doc-tool-button cursor-target${tile ? " is-active" : ""}`}
                        onClick={() => {
                            setTile((v) => !v);
                            setPreviewBytes(null);
                        }}
                    >
                        Tile pattern
                    </button>
                    <button
                        type="button"
                        className="doc-tool-button cursor-target"
                        onClick={handlePreview}
                        disabled={running || !file}
                    >
                        {previewBytes ? "Refresh Preview" : "Preview PDF"}
                    </button>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={handleDownload}
                        disabled={running || !file}
                    >
                        Save & Download
                    </button>
                </div>

                {status ? <p className="doc-tool-status">{status}</p> : null}
            </div>

            {previewBytes ? (
                <div className="doc-tool-panel">
                    <h2 className="doc-tool-section-title">Watermark preview</h2>
                    <PdfPreview bytes={previewBytes} title="Watermarked PDF preview" />
                </div>
            ) : null}
        </DocToolShell>
    );
}

export default Watermarking;

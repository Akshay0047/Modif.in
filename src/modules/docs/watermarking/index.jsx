import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { addWatermark, rgb } from "../_shared/pdfUtils";

function Watermarking() {
    const [file, setFile] = useState(null);
    const [text, setText] = useState("CONFIDENTIAL");
    const [opacity, setOpacity] = useState(0.3);
    const [fontSize, setFontSize] = useState(48);
    const [angle, setAngle] = useState(-45);
    const [tile, setTile] = useState(false);
    const [status, setStatus] = useState("");
    const [running, setRunning] = useState(false);

    const handleApply = async (files) => {
        const next = files[0] ?? null;
        setFile(next);
        if (!next) return;

        setRunning(true);
        setStatus("Applying watermark…");

        try {
            const buffer = await readFileAsArrayBuffer(next);
            const result = await addWatermark(buffer, {
                text,
                opacity,
                fontSize,
                angle,
                tile,
                color: rgb(0.5, 0.5, 0.5),
            });
            downloadBytes(
                result,
                `${getBaseName(next.name)}-watermarked.pdf`,
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
            description="Overlay customizable text watermarks onto every page of a PDF."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    files={file ? [file] : []}
                    onFiles={handleApply}
                    label="Drop a PDF file"
                />

                <div className="doc-tool-grid doc-tool-grid--2" style={{ marginTop: "1rem" }}>
                    <div>
                        <label className="doc-tool-label">Watermark text</label>
                        <input
                            className="doc-tool-input cursor-target"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="doc-tool-label">Opacity ({opacity})</label>
                        <input
                            className="doc-tool-range cursor-target"
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.05"
                            value={opacity}
                            onChange={(e) => setOpacity(Number(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="doc-tool-label">Font size ({fontSize}px)</label>
                        <input
                            className="doc-tool-range cursor-target"
                            type="range"
                            min="12"
                            max="120"
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="doc-tool-label">Angle ({angle}°)</label>
                        <input
                            className="doc-tool-range cursor-target"
                            type="range"
                            min="-90"
                            max="90"
                            value={angle}
                            onChange={(e) => setAngle(Number(e.target.value))}
                        />
                    </div>
                </div>

                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className={`doc-tool-button cursor-target${tile ? " is-active" : ""}`}
                        onClick={() => setTile((v) => !v)}
                    >
                        Tile pattern
                    </button>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={() => file && handleApply([file])}
                        disabled={running || !file}
                    >
                        Apply Watermark
                    </button>
                </div>

                {status ? <p className="doc-tool-status">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default Watermarking;

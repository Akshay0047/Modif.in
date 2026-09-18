import { useEffect, useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { loadPdfWithPdfJs, reorderPages, renderPageToDataUrl } from "../_shared/pdfUtils";

function PageOrganizer() {
    const [file, setFile] = useState(null);
    const [buffer, setBuffer] = useState(null);
    const [order, setOrder] = useState([]);
    const [rotations, setRotations] = useState({});
    const [thumbnails, setThumbnails] = useState([]);
    const [dragIndex, setDragIndex] = useState(null);
    const [status, setStatus] = useState("");

    useEffect(() => {
        if (!buffer) return undefined;
        let cancelled = false;

        (async () => {
            const pdf = await loadPdfWithPdfJs(buffer);
            if (cancelled) return;
            const indices = Array.from({ length: pdf.numPages }, (_, i) => i);
            setOrder(indices);
            setRotations({});

            const thumbs = [];
            for (let i = 1; i <= pdf.numPages; i += 1) {
                thumbs.push(await renderPageToDataUrl(pdf, i, 0.4));
            }
            pdf.destroy();
            if (!cancelled) setThumbnails(thumbs);
        })();

        return () => {
            cancelled = true;
        };
    }, [buffer]);

    const handleFile = async (files) => {
        const next = files[0] ?? null;
        setFile(next);
        setStatus("");
        setBuffer(next ? await readFileAsArrayBuffer(next) : null);
    };

    const movePage = (from, to) => {
        if (from === to) return;
        setOrder((prev) => {
            const next = [...prev];
            const [item] = next.splice(from, 1);
            next.splice(to, 0, item);
            return next;
        });
    };

    const rotatePage = (position) => {
        const pageIndex = order[position];
        setRotations((prev) => ({
            ...prev,
            [pageIndex]: ((prev[pageIndex] ?? 0) + 90) % 360,
        }));
    };

    const deletePage = (position) => {
        setOrder((prev) => prev.filter((_, i) => i !== position));
    };

    const handleSave = async () => {
        if (!buffer || !file || order.length === 0) return;
        setStatus("Saving reorganized PDF…");
        try {
            const result = await reorderPages(buffer, order, rotations);
            downloadBytes(
                result,
                `${getBaseName(file.name)}-organized.pdf`,
                "application/pdf",
            );
            setStatus("Reorganized PDF downloaded successfully.");
        } catch (error) {
            setStatus(error?.message ?? "Failed to save PDF.");
        }
    };

    return (
        <DocToolShell
            title="Page Organizer"
            description="Reorder, rotate, and delete PDF pages with visual drag-and-drop."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    files={file ? [file] : []}
                    onFiles={handleFile}
                    label="Drop a PDF file"
                />

                {order.length > 0 ? (
                    <>
                        <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                            <button
                                type="button"
                                className="doc-tool-button doc-tool-button--primary cursor-target"
                                onClick={handleSave}
                            >
                                Save & Download
                            </button>
                        </div>

                        <div className="doc-tool-page-grid">
                            {order.map((pageIndex, position) => (
                                <div
                                    key={`${pageIndex}-${position}`}
                                    className="doc-tool-page-thumb"
                                    draggable
                                    onDragStart={() => setDragIndex(position)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => {
                                        if (dragIndex !== null) movePage(dragIndex, position);
                                        setDragIndex(null);
                                    }}
                                >
                                    <img
                                        src={thumbnails[pageIndex]}
                                        alt={`Page ${pageIndex + 1}`}
                                        style={{
                                            transform: `rotate(${rotations[pageIndex] ?? 0}deg)`,
                                        }}
                                    />
                                    <span className="doc-tool-page-thumb__label">
                                        Page {pageIndex + 1}
                                    </span>
                                    <div className="doc-tool-controls" style={{ padding: "0.5rem" }}>
                                        <button
                                            type="button"
                                            className="doc-tool-button cursor-target"
                                            onClick={() => rotatePage(position)}
                                        >
                                            Rotate
                                        </button>
                                        <button
                                            type="button"
                                            className="doc-tool-button cursor-target"
                                            onClick={() => deletePage(position)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : null}

                {status ? <p className="doc-tool-status doc-tool-status--success">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default PageOrganizer;

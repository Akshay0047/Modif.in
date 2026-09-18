import { useEffect, useRef, useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { downloadBytes } from "../_shared/downloadUtils";
import { readFileAsArrayBuffer, replaceExtension } from "../_shared/fileUtils";
import {
    PDFDocument,
    degrees,
    loadPdfJsDocument,
    loadPdfLibDocument,
    renderPageToCanvas,
} from "../_shared/pdfUtils";

function PageThumbnail({ pdfDoc, pageIndex, rotation, onRotate, onDelete, dragProps }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        const canvas = canvasRef.current;
        if (!pdfDoc || !canvas) return undefined;

        renderPageToCanvas(pdfDoc, pageIndex + 1, canvas, 0.35).then(() => {
            if (cancelled || !rotation) return;
            const context = canvas.getContext("2d");
            const image = context.getImageData(0, 0, canvas.width, canvas.height);
            const rotated = document.createElement("canvas");
            const rotContext = rotated.getContext("2d");
            rotated.width = canvas.height;
            rotated.height = canvas.width;
            rotContext.putImageData(image, 0, 0);
            canvas.width = rotated.width;
            canvas.height = rotated.height;
            context.save();
            context.translate(canvas.width / 2, canvas.height / 2);
            context.rotate((rotation * Math.PI) / 180);
            context.drawImage(rotated, -image.width / 2, -image.height / 2);
            context.restore();
            rotated.width = 0;
            rotated.height = 0;
        });

        return () => {
            cancelled = true;
            if (canvas) {
                canvas.width = 0;
                canvas.height = 0;
            }
        };
    }, [pdfDoc, pageIndex, rotation]);

    return (
        <div className="doc-tool-page-thumb" draggable {...dragProps}>
            <canvas ref={canvasRef} className="doc-tool-page-thumb__canvas" />
            <span className="doc-tool-page-thumb__label">Page {pageIndex + 1}</span>
            <div className="doc-tool-controls" style={{ padding: "0.35rem" }}>
                <button type="button" className="doc-tool-button cursor-target" onClick={onRotate}>
                    Rotate
                </button>
                <button type="button" className="doc-tool-button cursor-target" onClick={onDelete}>
                    Delete
                </button>
            </div>
        </div>
    );
}

function PageOrganizer() {
    const [file, setFile] = useState(null);
    const [pdfJsDoc, setPdfJsDoc] = useState(null);
    const [sourceBuffer, setSourceBuffer] = useState(null);
    const [pageOrder, setPageOrder] = useState([]);
    const [rotations, setRotations] = useState({});
    const [dragIndex, setDragIndex] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!file) return undefined;
        let cancelled = false;

        (async () => {
            setLoading(true);
            setError("");
            try {
                const buffer = await readFileAsArrayBuffer(file);
                const doc = await loadPdfJsDocument(buffer);
                if (cancelled) return;
                setSourceBuffer(buffer);
                setPdfJsDoc(doc);
                setPageOrder(Array.from({ length: doc.numPages }, (_, index) => index));
                setRotations({});
            } catch (loadError) {
                if (!cancelled) {
                    setError(loadError instanceof Error ? loadError.message : "Failed to load PDF.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [file]);

    const movePage = (from, to) => {
        if (from === to || from === null || to === null) return;
        setPageOrder((current) => {
            const next = [...current];
            const [item] = next.splice(from, 1);
            next.splice(to, 0, item);
            return next;
        });
    };

    const rotatePage = (pageIndex) => {
        setRotations((current) => ({
            ...current,
            [pageIndex]: ((current[pageIndex] ?? 0) + 90) % 360,
        }));
    };

    const deletePage = (position) => {
        setPageOrder((current) => current.filter((_, index) => index !== position));
    };

    const applyChanges = async () => {
        if (!sourceBuffer || !file || !pageOrder.length) return;
        setLoading(true);
        setError("");
        try {
            const sourcePdf = await loadPdfLibDocument(sourceBuffer);
            const output = await PDFDocument.create();
            const pages = await output.copyPages(sourcePdf, pageOrder);
            pages.forEach((page, index) => {
                const rotation = rotations[pageOrder[index]] ?? 0;
                if (rotation) page.setRotation(degrees(rotation));
                output.addPage(page);
            });
            const bytes = await output.save();
            downloadBytes(bytes, replaceExtension(file.name, "-organized.pdf"), "application/pdf");
        } catch (applyError) {
            setError(applyError instanceof Error ? applyError.message : "Failed to organize pages.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DocToolShell
            title="Page Organizer"
            description="Reorder, rotate, and delete PDF pages visually before exporting a new document."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    label="Drop a PDF file here or click to browse"
                    onFiles={(files) => setFile(files[0] ?? null)}
                    disabled={loading}
                />

                {pdfJsDoc && pageOrder.length ? (
                    <>
                        <p className="doc-tool-status">Drag thumbnails to reorder pages.</p>
                        <div className="doc-tool-page-grid" style={{ marginTop: "1rem" }}>
                            {pageOrder.map((pageIndex, position) => (
                                <PageThumbnail
                                    key={`${pageIndex}-${position}`}
                                    pdfDoc={pdfJsDoc}
                                    pageIndex={pageIndex}
                                    rotation={rotations[pageIndex] ?? 0}
                                    onRotate={() => rotatePage(pageIndex)}
                                    onDelete={() => deletePage(position)}
                                    dragProps={{
                                        onDragStart: () => setDragIndex(position),
                                        onDragOver: (event) => event.preventDefault(),
                                        onDrop: () => {
                                            movePage(dragIndex, position);
                                            setDragIndex(null);
                                        },
                                        onDragEnd: () => setDragIndex(null),
                                    }}
                                />
                            ))}
                        </div>
                        <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                            <button
                                type="button"
                                className="doc-tool-button doc-tool-button--primary cursor-target"
                                onClick={applyChanges}
                                disabled={loading}
                            >
                                {loading ? "Processing…" : "Export organized PDF"}
                            </button>
                        </div>
                    </>
                ) : null}

                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default PageOrganizer;

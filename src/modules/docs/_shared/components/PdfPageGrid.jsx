import { useEffect, useRef } from "react";
import { renderPageToCanvas } from "../pdfUtils";

function PdfPageThumbnail({
    pdfDoc,
    pageNum,
    selected,
    onToggle,
    rotation = 0,
}) {
    const canvasRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        const canvas = canvasRef.current;
        if (!pdfDoc || !canvas) return undefined;

        renderPageToCanvas(pdfDoc, pageNum, canvas, 0.35).then(() => {
            if (cancelled) return;
            if (rotation) {
                const context = canvas.getContext("2d");
                const image = context.getImageData(0, 0, canvas.width, canvas.height);
                const rotated = document.createElement("canvas");
                const rotContext = rotated.getContext("2d");
                if (rotation % 180 === 90) {
                    rotated.width = canvas.height;
                    rotated.height = canvas.width;
                } else {
                    rotated.width = canvas.width;
                    rotated.height = canvas.height;
                }
                rotContext.putImageData(image, 0, 0);
                canvas.width = rotated.width;
                canvas.height = rotated.height;
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.save();
                context.translate(canvas.width / 2, canvas.height / 2);
                context.rotate((rotation * Math.PI) / 180);
                context.drawImage(rotated, -image.width / 2, -image.height / 2);
                context.restore();
                rotated.width = 0;
                rotated.height = 0;
            }
        });

        return () => {
            cancelled = true;
            canvas.width = 0;
            canvas.height = 0;
        };
    }, [pdfDoc, pageNum, rotation]);

    return (
        <button
            type="button"
            className={`doc-tool-page-thumb cursor-target${selected ? " is-selected" : ""}`}
            onClick={() => onToggle(pageNum - 1)}
            aria-pressed={selected}
        >
            <canvas ref={canvasRef} className="doc-tool-page-thumb__canvas" />
            <span className="doc-tool-page-thumb__label">Page {pageNum}</span>
        </button>
    );
}

function PdfPageGrid({ pdfDoc, totalPages, selectedPages, onTogglePage, rotations = {} }) {
    return (
        <div className="doc-tool-page-grid">
            {Array.from({ length: totalPages }, (_, index) => {
                const pageNum = index + 1;
                return (
                    <PdfPageThumbnail
                        key={pageNum}
                        pdfDoc={pdfDoc}
                        pageNum={pageNum}
                        selected={selectedPages.has(index)}
                        onToggle={onTogglePage}
                        rotation={rotations[index] ?? 0}
                    />
                );
            })}
        </div>
    );
}

export default PdfPageGrid;

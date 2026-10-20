import { handleFilePickerKeyDown } from "../_shared/imageToolUtils";
import { useCallback, useEffect, useRef, useState } from "react";
import ImageToolWorkspace from "../_shared/ImageToolWorkspace";
import {copyTextToClipboard,
    EXIF_ACCEPT,
    formatBytes,
    loadImageFromFileWithProgress,
    MB,
    replaceExtension,
    stripExifFromImage,
    triggerDownload,
    validateExifImage, preventDragDefaults } from "../_shared/imageToolUtils";
// preventDragDefaults imported below

const MAX_BYTES = 40 * MB;

const EXIF_LABELS = {
    Make: "Camera Make",
    Model: "Camera Model",
    LensModel: "Lens",
    ISO: "ISO",
    FNumber: "F-Number",
    ExposureTime: "Shutter Speed",
    FocalLength: "Focal Length",
    Software: "Software",
    DateTimeOriginal: "Date Taken",
    CreateDate: "Create Date",
    ModifyDate: "Modify Date",
    Orientation: "Orientation",
    ImageWidth: "Image Width",
    ImageHeight: "Image Height",
    latitude: "GPS Latitude",
    longitude: "GPS Longitude",
};

function formatExifValue(key, value) {
    if (value == null) return "—";
    if (key === "ExposureTime" && typeof value === "number") {
        if (value >= 1) return `${value}s`;
        return `1/${Math.round(1 / value)}s`;
    }
    if (key === "FNumber" && typeof value === "number") return `f/${value}`;
    if (key === "FocalLength" && typeof value === "number") return `${value}mm`;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

function ExifDataViewerStripper() {
    const [exifData, setExifData] = useState(null);
    const [exifRows, setExifRows] = useState([]);
    const [fileMeta, setFileMeta] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [hasImage, setHasImage] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [progress, setProgress] = useState(0);
    const [showProgress, setShowProgress] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const imageRef = useRef(null);
    const objectUrlRef = useRef("");
    const fileInputRef = useRef(null);

    const revokeObjectUrl = useCallback(() => {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = "";
        }
        setPreviewUrl("");
        setHasImage(false);
    }, []);

    useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

    const processFile = useCallback(
        async (file) => {
            setError("");
            setStatus("");
            const validation = validateExifImage(file, MAX_BYTES);
            if (!validation.ok) {
                setError(validation.error);
                return;
            }
            setShowProgress(true);
            setProgress(0);
            revokeObjectUrl();
            try {
                setProgress(20);
                const exifr = await import("exifr");
                const parsed = await exifr.parse(file, { gps: true });
                setExifData(parsed || {});
                const rows = Object.entries(EXIF_LABELS)
                    .map(([key, label]) => ({
                        key,
                        label,
                        value: parsed?.[key],
                    }))
                    .filter((row) => row.value != null && row.value !== "");
                if (parsed?.latitude != null && parsed?.longitude != null) {
                    rows.push({
                        key: "gps",
                        label: "GPS Map",
                        value: `https://www.google.com/maps?q=${parsed.latitude},${parsed.longitude}`,
                        isLink: true,
                    });
                }
                setExifRows(rows);
                setProgress(50);
                const loaded = await loadImageFromFileWithProgress(file, setProgress);
                objectUrlRef.current = loaded.objectUrl;
                imageRef.current = loaded.image;
                setPreviewUrl(loaded.objectUrl);
                setHasImage(true);
                setFileMeta({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    width: loaded.width,
                    height: loaded.height,
                });
                setStatus(
                    rows.length
                        ? `Found ${rows.length} EXIF fields.`
                        : "No EXIF metadata found in this file.",
                );
            } catch (err) {
                setError(err instanceof Error ? err.message : "Could not read EXIF data.");
            } finally {
                setShowProgress(false);
            }
        },
        [revokeObjectUrl],
    );

    const copyExifJson = useCallback(async () => {
        if (!exifData) return;
        try {
            await copyTextToClipboard(JSON.stringify(exifData, null, 2));
            setStatus("EXIF JSON copied to clipboard.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Copy failed.");
        }
    }, [exifData]);

    const downloadClean = useCallback(async () => {
        const image = imageRef.current;
        const meta = fileMeta;
        if (!image || !meta) return;
        setShowProgress(true);
        setProgress(40);
        try {
            const mimeType = meta.type?.includes("png") ? "image/png" : "image/jpeg";
            const blob = await stripExifFromImage(image, mimeType, 0.92);
            const ext = mimeType === "image/png" ? "png" : "jpg";
            triggerDownload(blob, replaceExtension(meta.name, ext));
            setStatus("Clean image downloaded (EXIF stripped).");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Export failed.");
        } finally {
            setShowProgress(false);
            setProgress(0);
        }
    }, [fileMeta]);

    const left = (
        <>
            <div
                className={`img-tool__dropzone cursor-target${isDragging ? " is-dragging" : ""}`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                    preventDragDefaults(e);
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={handleFilePickerKeyDown}
                role="button"
                tabIndex={0}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={EXIF_ACCEPT}
                    className="img-tool__dropzone-input"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) processFile(file);
                    }}
                />
                <p className="img-tool__dropzone-text">
                    Drop JPG, JPEG, TIFF, or PNG
                    <br />
                    <span>Max 40 MB</span>
                </p>
            </div>

            {fileMeta ? (
                <div className="img-tool__meta">
                    <span className="img-tool__chip">
                        <strong>File</strong> {fileMeta.name}
                    </span>
                    <span className="img-tool__chip">
                        <strong>Size</strong> {formatBytes(fileMeta.size)}
                    </span>
                    <span className="img-tool__chip">
                        <strong>Dimensions</strong> {fileMeta.width}×{fileMeta.height}
                    </span>
                </div>
            ) : null}

            <div className="img-tool__actions">
                <button
                    type="button"
                    className="img-tool__btn img-tool__btn--primary cursor-target"
                    onClick={downloadClean}
                    disabled={!hasImage}
                >
                    Download Clean Image
                </button>
                <button
                    type="button"
                    className="img-tool__btn cursor-target"
                    onClick={copyExifJson}
                    disabled={!exifData}
                >
                    Copy EXIF JSON
                </button>
            </div>

            <p className="img-tool__hint">
                Re-exporting through canvas removes all embedded EXIF metadata.
            </p>
        </>
    );

    const right = (
        <>
            <div className="img-tool__preview-frame">
                {previewUrl ? (
                    <img
                        src={previewUrl}
                        alt="EXIF preview"
                        className="img-tool__preview-image"
                    />
                ) : (
                    <p className="img-tool__preview-empty">
                        Upload an image to inspect its EXIF metadata.
                    </p>
                )}
            </div>

            {exifRows.length ? (
                <div className="img-tool__exif-scroll">
                    <table className="img-tool__exif-table">
                        <tbody>
                            {exifRows.map((row) => (
                                <tr key={row.key}>
                                    <th>{row.label}</th>
                                    <td>
                                        {row.isLink ? (
                                            <a
                                                href={row.value}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="cursor-target"
                                            >
                                                Open in Google Maps
                                            </a>
                                        ) : (
                                            formatExifValue(row.key, row.value)
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : fileMeta ? (
                <p className="img-tool__hint">No EXIF fields were detected in this file.</p>
            ) : null}
        </>
    );

    return (
        <ImageToolWorkspace
            title="EXIF Data Viewer & Stripper"
            error={error}
            status={status}
            left={left}
            right={right}
            progress={progress}
            progressLabel="Reading metadata"
            showProgress={showProgress}
        />
    );
}

export default ExifDataViewerStripper;

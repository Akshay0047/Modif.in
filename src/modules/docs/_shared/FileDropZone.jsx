import { useRef, useState } from "react";
import { formatFileSize } from "./downloadUtils";

function FileDropZone({
    accept,
    multiple = false,
    files = [],
    onFiles,
    onPreview,
    reorderable = false,
    label = "Drop files here or click to browse",
    hint = "All processing happens locally in your browser",
}) {
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFiles = (fileList) => {
        const next = multiple ? [...files, ...fileList] : [fileList[0]];
        onFiles(next.filter(Boolean));
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setDragOver(false);
        handleFiles(Array.from(event.dataTransfer.files));
    };

    const removeFile = (index) => {
        onFiles(files.filter((_, i) => i !== index));
    };

    const moveFile = (index, direction) => {
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= files.length) return;
        const next = [...files];
        const [item] = next.splice(index, 1);
        next.splice(nextIndex, 0, item);
        onFiles(next);
    };

    return (
        <div>
            <div
                className={`doc-tool-dropzone cursor-target${dragOver ? " is-dragover" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        inputRef.current?.click();
                    }
                }}
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
            >
                <span className="doc-tool-dropzone__label">{label}</span>
                <span className="doc-tool-dropzone__hint">{hint}</span>
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    hidden
                    onChange={(event) => {
                        handleFiles(Array.from(event.target.files ?? []));
                        event.target.value = "";
                    }}
                />
            </div>

            {files.length > 0 ? (
                <ul className="doc-tool-file-list">
                    {files.map((file, index) => (
                        <li key={`${file.name}-${index}`} className="doc-tool-file-item">
                            <span className="doc-tool-file-item__index">{index + 1}</span>
                            <span className="doc-tool-file-item__name">{file.name}</span>
                            <span className="doc-tool-file-item__size">
                                {formatFileSize(file.size)}
                            </span>
                            <div className="doc-tool-file-item__actions">
                                {reorderable ? (
                                    <>
                                        <button
                                            type="button"
                                            className="doc-tool-button cursor-target"
                                            disabled={index === 0}
                                            onClick={() => moveFile(index, -1)}
                                        >
                                            Up
                                        </button>
                                        <button
                                            type="button"
                                            className="doc-tool-button cursor-target"
                                            disabled={index === files.length - 1}
                                            onClick={() => moveFile(index, 1)}
                                        >
                                            Down
                                        </button>
                                    </>
                                ) : null}
                                {onPreview ? (
                                    <button
                                        type="button"
                                        className="doc-tool-button cursor-target"
                                        onClick={() => onPreview(file, index)}
                                    >
                                        Preview
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    className="doc-tool-button cursor-target"
                                    onClick={() => removeFile(index)}
                                >
                                    Remove
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}

export default FileDropZone;

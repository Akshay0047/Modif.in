import { useRef, useState } from "react";
import { formatFileSize } from "./downloadUtils";

function FileDropZone({
    accept,
    multiple = false,
    files = [],
    onFiles,
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
                            <span className="doc-tool-file-item__name">{file.name}</span>
                            <span className="doc-tool-file-item__size">
                                {formatFileSize(file.size)}
                            </span>
                            <button
                                type="button"
                                className="doc-tool-button cursor-target"
                                onClick={() => removeFile(index)}
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}

export default FileDropZone;

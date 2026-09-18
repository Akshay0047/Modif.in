import { useRef, useState } from "react";

function FileDropZone({
    accept,
    multiple = false,
    label = "Drop files here or click to browse",
    hint,
    onFiles,
    disabled = false,
}) {
    const inputRef = useRef(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleFiles = (fileList) => {
        const files = Array.from(fileList ?? []);
        if (files.length) onFiles(files);
    };

    return (
        <div
            className={`doc-tool-dropzone cursor-target${isDragOver ? " is-dragover" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => !disabled && inputRef.current?.click()}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (!disabled) inputRef.current?.click();
                }
            }}
            onDragOver={(event) => {
                event.preventDefault();
                if (!disabled) setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(event) => {
                event.preventDefault();
                setIsDragOver(false);
                if (!disabled) handleFiles(event.dataTransfer.files);
            }}
        >
            <p>{label}</p>
            {hint ? <p className="doc-tool-dropzone__hint">{hint}</p> : null}
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                hidden
                disabled={disabled}
                onChange={(event) => handleFiles(event.target.files)}
            />
        </div>
    );
}

export default FileDropZone;

import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { downloadBlob, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { writeTextPdf } from "../_shared/unicodeTextPdf";
import ePub from "epubjs";

async function extractEpubText(arrayBuffer) {
    const book = ePub(arrayBuffer);
    await book.ready;
    const spine = await book.loaded.spine;
    const sections = [];

    for (const item of spine.items) {
        const doc = await book.load(item.href);
        const text = doc?.documentElement?.textContent?.trim();
        if (text) sections.push(text);
    }

    book.destroy();
    return sections.join("\n\n");
}

async function textToPdf(text) {
    return writeTextPdf(text, { fontSize: 11 });
}

function EbookConversion() {
    const [file, setFile] = useState(null);
    const [output, setOutput] = useState("txt");
    const [status, setStatus] = useState("");
    const [running, setRunning] = useState(false);

    const handleConvert = async () => {
        if (!file) return;
        setRunning(true);
        setStatus("Parsing e-book…");

        try {
            const buffer = await readFileAsArrayBuffer(file);
            const text = await extractEpubText(buffer);

            if (output === "txt") {
                downloadBlob(
                    new Blob([text], { type: "text/plain" }),
                    `${getBaseName(file.name)}.txt`,
                );
            } else {
                const pdfBytes = await textToPdf(text);
                const blob = new Blob([pdfBytes], { type: "application/pdf" });
                downloadBlob(blob, `${getBaseName(file.name)}.pdf`);
            }

            setStatus("E-book converted successfully.");
        } catch (error) {
            setStatus(error?.message ?? "Conversion failed.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <DocToolShell
            title="E-Book Conversion"
            description="Convert EPUB e-books to plain text or structured PDF."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".epub,application/epub+zip"
                    files={file ? [file] : []}
                    onFiles={(files) => setFile(files[0] ?? null)}
                    label="Drop an EPUB file"
                />

                <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                    <button
                        type="button"
                        className={`doc-tool-button cursor-target${output === "txt" ? " is-active" : ""}`}
                        onClick={() => setOutput("txt")}
                    >
                        TXT
                    </button>
                    <button
                        type="button"
                        className={`doc-tool-button cursor-target${output === "pdf" ? " is-active" : ""}`}
                        onClick={() => setOutput("pdf")}
                    >
                        PDF
                    </button>
                    <button
                        type="button"
                        className="doc-tool-button doc-tool-button--primary cursor-target"
                        onClick={handleConvert}
                        disabled={running || !file}
                    >
                        Convert
                    </button>
                </div>
                {status ? <p className="doc-tool-status">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default EbookConversion;

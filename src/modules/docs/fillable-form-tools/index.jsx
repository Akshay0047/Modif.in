import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { downloadBytes } from "../_shared/downloadUtils";
import { readFileAsArrayBuffer, replaceExtension } from "../_shared/fileUtils";
import { loadPdfLibDocument } from "../_shared/pdfUtils";

function FillableFormTools() {
    const [fields, setFields] = useState([]);
    const [values, setValues] = useState({});
    const [filename, setFilename] = useState("");
    const [sourceBuffer, setSourceBuffer] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const loadForm = async (files) => {
        const file = files[0];
        if (!file) return;
        setLoading(true);
        setError("");
        try {
            const buffer = await readFileAsArrayBuffer(file);
            const pdf = await loadPdfLibDocument(buffer);
            const form = pdf.getForm();
            const formFields = form.getFields().map((field) => {
                const name = field.getName();
                let value = "";
                let type = field.constructor.name;
                try {
                    if (typeof field.getText === "function") value = field.getText();
                    else if (typeof field.isChecked === "function") value = field.isChecked();
                } catch {
                    value = "";
                }
                return { name, type, value };
            });
            setFields(formFields);
            setValues(
                Object.fromEntries(
                    formFields.map((field) => [
                        field.name,
                        typeof field.value === "boolean" ? field.value : String(field.value ?? ""),
                    ]),
                ),
            );
            setSourceBuffer(buffer);
            setFilename(file.name);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Failed to read form fields.");
            setFields([]);
        } finally {
            setLoading(false);
        }
    };

    const saveForm = async () => {
        if (!sourceBuffer) return;
        setLoading(true);
        setError("");
        try {
            const pdf = await loadPdfLibDocument(sourceBuffer);
            const form = pdf.getForm();
            form.getFields().forEach((field) => {
                const name = field.getName();
                const value = values[name];
                try {
                    if (typeof field.setText === "function") field.setText(String(value ?? ""));
                    else if (typeof field.check === "function" && typeof field.uncheck === "function") {
                        if (value === true || value === "true") field.check();
                        else field.uncheck();
                    }
                } catch {
                    // Unsupported field mutation.
                }
            });
            const bytes = await pdf.save();
            downloadBytes(bytes, replaceExtension(filename, "-filled.pdf"), "application/pdf");
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Failed to save form.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DocToolShell
            title="Fillable Form Tools"
            description="Parse AcroForm fields and populate PDF form inputs before saving locally."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    label="Drop a fillable PDF form"
                    onFiles={loadForm}
                    disabled={loading}
                />

                {fields.length ? (
                    <>
                        <div className="doc-tool-grid" style={{ marginTop: "1rem" }}>
                            {fields.map((field) => (
                                <div key={field.name}>
                                    <label className="doc-tool-label" htmlFor={field.name}>
                                        {field.name} <span className="doc-tool-status">({field.type})</span>
                                    </label>
                                    {typeof field.value === "boolean" || field.type.includes("Check") ? (
                                        <label className="doc-tool-checkbox">
                                            <input
                                                id={field.name}
                                                type="checkbox"
                                                className="cursor-target"
                                                checked={values[field.name] === true || values[field.name] === "true"}
                                                onChange={(event) =>
                                                    setValues((current) => ({
                                                        ...current,
                                                        [field.name]: event.target.checked,
                                                    }))
                                                }
                                            />
                                            Checked
                                        </label>
                                    ) : (
                                        <input
                                            id={field.name}
                                            className="doc-tool-input cursor-target"
                                            value={values[field.name] ?? ""}
                                            onChange={(event) =>
                                                setValues((current) => ({
                                                    ...current,
                                                    [field.name]: event.target.value,
                                                }))
                                            }
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="doc-tool-controls">
                            <button
                                type="button"
                                className="doc-tool-button doc-tool-button--primary cursor-target"
                                onClick={saveForm}
                                disabled={loading}
                            >
                                Save filled PDF
                            </button>
                        </div>
                    </>
                ) : null}

                {loading ? <p className="doc-tool-status">Processing form…</p> : null}
                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default FillableFormTools;

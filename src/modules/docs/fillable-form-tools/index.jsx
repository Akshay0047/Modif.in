import { useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { downloadBytes, getBaseName, readFileAsArrayBuffer } from "../_shared/downloadUtils";
import { loadPdfWithPdfLib } from "../_shared/pdfUtils";
import { formFieldKind } from "./fieldKind";

function FillableFormTools() {
    const [fields, setFields] = useState([]);
    const [values, setValues] = useState({});
    const [buffer, setBuffer] = useState(null);
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState("");

    const handleFile = async (files) => {
        const next = files[0] ?? null;
        setFile(next);
        if (!next) {
            setBuffer(null);
            setFields([]);
            return;
        }

        const arrayBuffer = await readFileAsArrayBuffer(next);
        setBuffer(arrayBuffer);

        try {
            const pdf = await loadPdfWithPdfLib(arrayBuffer);
            const form = pdf.getForm();
            const formFields = form.getFields().map((field) => {
                const name = field.getName();
                const type = formFieldKind(field);
                let value = "";
                try {
                    if (type === "text") value = field.getText() ?? "";
                    else if (type === "checkbox") value = field.isChecked() ? "true" : "false";
                } catch {
                    value = "";
                }
                return { name, type, value };
            });
            setFields(formFields);
            setValues(
                Object.fromEntries(formFields.map((f) => [f.name, f.value])),
            );
            setStatus(`Found ${formFields.length} form field(s).`);
        } catch {
            setFields([]);
            setStatus("No AcroForm fields detected in this PDF.");
        }
    };

    const handleSave = async () => {
        if (!buffer || !file) return;
        setStatus("Saving form data…");

        try {
            const pdf = await loadPdfWithPdfLib(buffer);
            const form = pdf.getForm();

            for (const field of form.getFields()) {
                const name = field.getName();
                const value = values[name];
                if (value === undefined) continue;

                try {
                    const type = formFieldKind(field);
                    if (type === "text") {
                        field.setText(String(value));
                    } else if (type === "checkbox") {
                        if (value === "true" || value === true) field.check();
                        else field.uncheck();
                    }
                } catch {
                    // Skip unsupported field types
                }
            }

            const result = await pdf.save();
            downloadBytes(
                result,
                `${getBaseName(file.name)}-filled.pdf`,
                "application/pdf",
            );
            setStatus("Filled PDF downloaded.");
        } catch (error) {
            setStatus(error?.message ?? "Save failed.");
        }
    };

    return (
        <DocToolShell
            title="Fillable Form Tools"
            description="Detect AcroForm fields and populate them before saving."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".pdf,application/pdf"
                    files={file ? [file] : []}
                    onFiles={handleFile}
                    label="Drop a PDF with form fields"
                />

                {fields.length > 0 ? (
                    <div style={{ marginTop: "1rem" }}>
                        {fields.map((field, index) => {
                            const fieldId = `fillable-field-${index}`;
                            return (
                            <div key={field.name} style={{ marginBottom: "0.75rem" }}>
                                <label className="doc-tool-label" htmlFor={field.type === "other" ? undefined : fieldId}>{field.name}</label>
                                {field.type === "checkbox" ? (
                                    <input
                                        id={fieldId}
                                        type="checkbox"
                                        className="cursor-target"
                                        checked={values[field.name] === "true"}
                                        onChange={(e) =>
                                            setValues((prev) => ({
                                                ...prev,
                                                [field.name]: e.target.checked ? "true" : "false",
                                            }))
                                        }
                                    />
                                ) : field.type === "text" ? (
                                    <input
                                        id={fieldId}
                                        className="doc-tool-input cursor-target"
                                        value={values[field.name] ?? ""}
                                        onChange={(e) =>
                                            setValues((prev) => ({
                                                ...prev,
                                                [field.name]: e.target.value,
                                            }))
                                        }
                                    />
                                ) : (
                                    <p className="doc-tool-status">This field type cannot be edited here.</p>
                                )}
                            </div>
                            );
                        })}
                        <button
                            type="button"
                            className="doc-tool-button doc-tool-button--primary cursor-target"
                            onClick={handleSave}
                        >
                            Save Filled PDF
                        </button>
                    </div>
                ) : null}

                {status ? <p className="doc-tool-status">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default FillableFormTools;

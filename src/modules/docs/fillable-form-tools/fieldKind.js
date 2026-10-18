import { PDFCheckBox, PDFTextField } from "pdf-lib";

export function formFieldKind(field) {
    if (field instanceof PDFTextField) return "text";
    if (field instanceof PDFCheckBox) return "checkbox";
    return "other";
}

export function imageEmbedPlan(file) {
    const name = file.name.toLowerCase();
    if (file.type === "image/png" || name.endsWith(".png")) return "png";
    if (file.type === "image/jpeg" || /\.jpe?g$/.test(name)) return "jpeg";
    return "decode";
}

export function legacyDocMessage(filename) {
    const name = String(filename ?? "").toLowerCase();
    if (name.endsWith(".doc") && !name.endsWith(".docx")) {
        return "Legacy .doc files are not supported. Save the document as .docx and try again.";
    }
    return "";
}

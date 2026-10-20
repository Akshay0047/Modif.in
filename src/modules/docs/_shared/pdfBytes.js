export function clonePdfBytes(input) {
    if (input == null) {
        throw new Error("Missing PDF data.");
    }

    if (input instanceof Uint8Array) {
        const { buffer, byteLength } = input;
        if (buffer instanceof ArrayBuffer && buffer.detached) {
            throw new Error("PDF data is no longer available. Re-add the file and try again.");
        }
        return Uint8Array.from(input.subarray(0, byteLength));
    }

    if (input instanceof ArrayBuffer) {
        if (input.detached) {
            throw new Error("PDF data is no longer available. Re-add the file and try again.");
        }
        return new Uint8Array(input.slice(0));
    }

    return Uint8Array.from(input);
}

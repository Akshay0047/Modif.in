import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { decodeBase64, encodeBase64, safeExecute } from "../_shared/encodingUtils";

function Base64EncoderDecoder() {
    const [input, setInput] = useState("");
    const [mode, setMode] = useState("encode");

    const output = useMemo(
        () =>
            safeExecute("base64", () =>
                mode === "encode" ? encodeBase64(input) : decodeBase64(input),
            ),
        [input, mode],
    );

    return (
        <TextToolShell title="Base64 Encoder / Decoder" description="Encode and decode text using Base64." leading={<BackButton />}>
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    <button type="button" className={`text-tool-button cursor-target${mode === "encode" ? " is-active" : ""}`} onClick={() => setMode("encode")}>Encode</button>
                    <button type="button" className={`text-tool-button cursor-target${mode === "decode" ? " is-active" : ""}`} onClick={() => setMode("decode")}>Decode</button>
                </div>
                <textarea className="text-tool-textarea" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-output-header"><h2 className="text-tool-section-title">Output</h2><CopyButton text={output.ok ? output.value : ""} disabled={!output.ok} /></div>
                {output.error ? <p className="text-tool-empty">{output.error}</p> : <textarea className="text-tool-textarea" value={output.value} readOnly />}
            </div>
        </TextToolShell>
    );
}

export default Base64EncoderDecoder;

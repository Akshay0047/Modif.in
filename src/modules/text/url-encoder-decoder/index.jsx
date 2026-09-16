import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { decodeUrl, encodeUrl, safeExecute } from "../_shared/encodingUtils";

function UrlEncoderDecoder() {
    const [input, setInput] = useState("");
    const [mode, setMode] = useState("encode");

    const output = useMemo(
        () => safeExecute("url", () => (mode === "encode" ? encodeUrl(input) : decodeUrl(input))),
        [input, mode],
    );

    return (
        <TextToolShell title="URL Encoder / Decoder" description="Encode and decode URL components safely." leading={<BackButton />}>
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

export default UrlEncoderDecoder;

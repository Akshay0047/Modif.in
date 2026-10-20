import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import {
    decodeHtmlEntities,
    encodeHtmlEntities,
} from "../_shared/developerUtils";

function HtmlEntityTools() {
    const [input, setInput] = useState('<div class="title">Tom & Jerry</div>');
    const [mode, setMode] = useState("encode");

    const output = useMemo(
        () => (mode === "encode" ? encodeHtmlEntities(input) : decodeHtmlEntities(input)),
        [input, mode],
    );

    return (
        <TextToolShell
            title="HTML Entity Tools"
            description="Encode and decode HTML entities for safe markup and readable text."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    <button aria-pressed={mode === "encode"}
                        type="button"
                        className={`text-tool-button cursor-target${
                            mode === "encode" ? " is-active" : ""
                        }`}
                        onClick={() => setMode("encode")}
                    >
                        Encode
                    </button>
                    <button aria-pressed={mode === "decode"}
                        type="button"
                        className={`text-tool-button cursor-target${
                            mode === "decode" ? " is-active" : ""
                        }`}
                        onClick={() => setMode("decode")}
                    >
                        Decode
                    </button>
                </div>
                <label className="text-tool-label" htmlFor="html-entity-input">{mode === "encode" ? "Text to encode" : "HTML entities to decode"}</label>
                <textarea id="html-entity-input"
                    className="text-tool-textarea"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Output</h2>
                    <CopyButton text={output} />
                </div>
                <textarea
                    className="text-tool-textarea"
                    value={output}
                    readOnly
                    aria-label="HTML entity output"
                />
            </div>
        </TextToolShell>
    );
}

export default HtmlEntityTools;

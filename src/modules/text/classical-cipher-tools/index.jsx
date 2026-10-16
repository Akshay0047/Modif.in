import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { atbashCipher, caesarCipher, rot13 } from "../_shared/encodingUtils";

function ClassicalCipherTools() {
    const [input, setInput] = useState("Hello World");
    const [cipher, setCipher] = useState("rot13");
    const [shift, setShift] = useState(3);

    const output = useMemo(() => {
        switch (cipher) {
            case "rot13":
                return rot13(input);
            case "caesar":
                return caesarCipher(input, shift);
            case "atbash":
                return atbashCipher(input);
            default:
                return input;
        }
    }, [input, cipher, shift]);

    return (
        <TextToolShell title="Classical Cipher Tools" description="Apply ROT13, Caesar cipher, and Atbash transformations to text." leading={<BackButton />} privacySensitive>
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    <button type="button" className={`text-tool-button cursor-target${cipher === "rot13" ? " is-active" : ""}`} onClick={() => setCipher("rot13")}>ROT13</button>
                    <button type="button" className={`text-tool-button cursor-target${cipher === "caesar" ? " is-active" : ""}`} onClick={() => setCipher("caesar")}>Caesar cipher</button>
                    <button type="button" className={`text-tool-button cursor-target${cipher === "atbash" ? " is-active" : ""}`} onClick={() => setCipher("atbash")}>Atbash</button>
                </div>
                {cipher === "caesar" ? (
                    <>
                        <label className="text-tool-label" htmlFor="cipher-shift">Shift: {shift}</label>
                        <input id="cipher-shift" className="text-tool-range" type="range" min={1} max={25} value={shift} onChange={(e) => setShift(Number(e.target.value))} />
                    </>
                ) : null}
                <label className="text-tool-label" htmlFor="cipher-input">Text to transform</label>
                <textarea id="cipher-input" className="text-tool-textarea" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-output-header"><h2 className="text-tool-section-title">Output</h2><CopyButton text={output} /></div>
                <textarea aria-label="Cipher output" className="text-tool-textarea" value={output} readOnly />
            </div>
        </TextToolShell>
    );
}

export default ClassicalCipherTools;

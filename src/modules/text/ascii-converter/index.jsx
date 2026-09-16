import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import {
    asciiToBinary,
    asciiToDecimal,
    asciiToHex,
    binaryToAscii,
    decimalToAscii,
    hexToAscii,
    safeExecute,
} from "../_shared/encodingUtils";

const MODES = [
    { id: "decimal", encode: asciiToDecimal, decode: decimalToAscii, label: "ASCII ↔ Decimal" },
    { id: "hex", encode: asciiToHex, decode: hexToAscii, label: "ASCII ↔ Hex" },
    { id: "binary", encode: asciiToBinary, decode: binaryToAscii, label: "ASCII ↔ Binary" },
];

function AsciiConverter() {
    const [input, setInput] = useState("Modif");
    const [mode, setMode] = useState("decimal");
    const [direction, setDirection] = useState("encode");

    const selected = MODES.find((entry) => entry.id === mode);

    const output = useMemo(
        () =>
            safeExecute("ascii", () =>
                direction === "encode"
                    ? selected.encode(input)
                    : selected.decode(input),
            ),
        [input, mode, direction, selected],
    );

    return (
        <TextToolShell title="ASCII Converter" description="Convert ASCII text to decimal, hex, and binary representations." leading={<BackButton />}>
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    {MODES.map((entry) => (
                        <button key={entry.id} type="button" className={`text-tool-button cursor-target${mode === entry.id ? " is-active" : ""}`} onClick={() => setMode(entry.id)}>{entry.label}</button>
                    ))}
                </div>
                <div className="text-tool-controls">
                    <button type="button" className={`text-tool-button cursor-target${direction === "encode" ? " is-active" : ""}`} onClick={() => setDirection("encode")}>Encode</button>
                    <button type="button" className={`text-tool-button cursor-target${direction === "decode" ? " is-active" : ""}`} onClick={() => setDirection("decode")}>Decode</button>
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

export default AsciiConverter;

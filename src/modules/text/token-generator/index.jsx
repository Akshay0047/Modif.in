import { useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import useGeneratedResult from "../_shared/useGeneratedResult";
import {
    generateApiToken,
    generateHexToken,
    generateRandomString,
} from "../_shared/generatorUtils";

function generateToken(type, length) {
    switch (type) {
        case "api": return generateApiToken(length);
        case "hex": return generateHexToken(Math.max(8, Math.ceil(length / 2)));
        default: return generateRandomString(length, "alphanumeric");
    }
}

function TokenGenerator() {
    const [type, setType] = useState("random");
    const [length, setLength] = useState(32);

    const result = useGeneratedResult(generateToken, [type, length]);

    const output = result.ok ? result.value : "";

    return (
        <TextToolShell
            title="Token Generator"
            description="Generate random strings, API-style tokens, and hex tokens."
            leading={<BackButton />}
            privacySensitive
        >
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    {[
                        ["random", "Random strings"],
                        ["api", "API-style tokens"],
                        ["hex", "Hex tokens"],
                    ].map(([id, label]) => (
                        <button
                            key={id}
                            type="button"
                            className={`text-tool-button cursor-target${
                                type === id ? " is-active" : ""
                            }`}
                            onClick={() => setType(id)}
                        >
                            {label}
                        </button>
                    ))}
                    <button
                        type="button"
                        className="text-tool-button cursor-target"
                        onClick={result.regenerate}
                    >
                        Regenerate
                    </button>
                </div>

                <label className="text-tool-label" htmlFor="token-length">
                    Length: {length}
                </label>
                <input
                    id="token-length"
                    className="text-tool-range"
                    type="range"
                    min={8}
                    max={128}
                    value={length}
                    onChange={(event) => setLength(Number(event.target.value))}
                />
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Generated token</h2>
                    <CopyButton text={output} disabled={!result.ok} />
                </div>
                {result.error ? <p className="text-tool-empty" role="alert">{result.error}</p> : null}
                <textarea
                    className="text-tool-textarea"
                    value={output}
                    readOnly
                    aria-label="Generated token"
                />
            </div>
        </TextToolShell>
    );
}

export default TokenGenerator;

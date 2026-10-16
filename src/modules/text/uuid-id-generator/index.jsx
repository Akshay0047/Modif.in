import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { safeExecute } from "../_shared/webSecurityUtils";
import {
    generateNanoId,
    generateUlid,
    generateUuidV4,
} from "../_shared/generatorUtils";

function UuidIdGenerator() {
    const [type, setType] = useState("uuid");
    const [count, setCount] = useState(1);
    const [nanoSize, setNanoSize] = useState(21);
    const [seed, setSeed] = useState(0);

    const result = useMemo(() => safeExecute("generate", () => {
        const generator =
            type === "ulid"
                ? generateUlid
                : type === "nanoid"
                  ? () => generateNanoId(nanoSize)
                  : generateUuidV4;

        return Array.from({ length: count }, () => generator()).join("\n");
    }), [type, count, nanoSize, seed]);

    const output = result.ok ? result.value : "";

    return (
        <TextToolShell
            title="UUID / ID Generator"
            description="Generate UUID, ULID, and NanoID identifiers for apps and databases."
            leading={<BackButton />}
            privacySensitive
        >
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    {[
                        ["uuid", "UUID"],
                        ["ulid", "ULID"],
                        ["nanoid", "NanoID"],
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
                        onClick={() => setSeed((value) => value + 1)}
                    >
                        Regenerate
                    </button>
                </div>

                <label className="text-tool-label" htmlFor="uuid-count">
                    Count: {count}
                </label>
                <input
                    id="uuid-count"
                    className="text-tool-range"
                    type="range"
                    min={1}
                    max={20}
                    value={count}
                    onChange={(event) => setCount(Number(event.target.value))}
                />

                {type === "nanoid" ? (
                    <>
                        <label className="text-tool-label" htmlFor="nanoid-size">
                            NanoID size: {nanoSize}
                        </label>
                        <input
                            id="nanoid-size"
                            className="text-tool-range"
                            type="range"
                            min={8}
                            max={64}
                            value={nanoSize}
                            onChange={(event) =>
                                setNanoSize(Number(event.target.value))
                            }
                        />
                    </>
                ) : null}
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Generated IDs</h2>
                    <CopyButton text={output} disabled={!result.ok} />
                </div>
                {result.error ? <p className="text-tool-empty" role="alert">{result.error}</p> : null}
                <textarea
                    className="text-tool-textarea"
                    value={output}
                    readOnly
                    aria-label="Generated IDs"
                />
            </div>
        </TextToolShell>
    );
}

export default UuidIdGenerator;

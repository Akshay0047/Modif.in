import { useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import useGeneratedResult from "../_shared/useGeneratedResult";
import {
    generateRandomNameValue,
    generateRandomNumber,
    generateRandomSentence,
    generateRandomWord,
} from "../_shared/generatorUtils";

function generateValues(type, count, min, max) {
    const generator = () => {
        switch (type) {
            case "word": return generateRandomWord();
            case "number": return generateRandomNumber(min, max);
            case "sentence": return generateRandomSentence();
            case "name": return generateRandomNameValue();
            default: return "";
        }
    };
    return Array.from({ length: count }, generator).join("\n");
}

function RandomGenerator() {
    const [type, setType] = useState("word");
    const [count, setCount] = useState(5);
    const [min, setMin] = useState(1);
    const [max, setMax] = useState(1000);
    const result = useGeneratedResult(generateValues, [type, count, min, max]);

    const output = result.ok ? result.value : "";

    return (
        <TextToolShell
            title="Random Generator"
            description="Generate random words, numbers, sentences, and names on demand."
            leading={<BackButton />}
            privacySensitive
        >
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    {[
                        ["word", "Random words"],
                        ["number", "Random numbers"],
                        ["sentence", "Random sentences"],
                        ["name", "Random names"],
                    ].map(([id, label]) => (
                        <button aria-pressed={type === id}
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

                <label className="text-tool-label" htmlFor="random-count">
                    Count: {count}
                </label>
                <input
                    id="random-count"
                    className="text-tool-range"
                    type="range"
                    min={1}
                    max={25}
                    value={count}
                    onChange={(event) => setCount(Number(event.target.value))}
                />

                {type === "number" ? (
                    <div className="text-tool-grid text-tool-grid--2">
                        <div>
                            <label className="text-tool-label" htmlFor="random-min">
                                Minimum
                            </label>
                            <input
                                id="random-min"
                                className="text-tool-input"
                                type="number"
                                value={min}
                                onChange={(event) =>
                                    setMin(Number(event.target.value))
                                }
                            />
                        </div>
                        <div>
                            <label className="text-tool-label" htmlFor="random-max">
                                Maximum
                            </label>
                            <input
                                id="random-max"
                                className="text-tool-input"
                                type="number"
                                value={max}
                                onChange={(event) =>
                                    setMax(Number(event.target.value))
                                }
                            />
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Generated values</h2>
                    <CopyButton text={output} disabled={!result.ok} />
                </div>
                {result.error ? <p className="text-tool-empty" role="alert">{result.error}</p> : null}
                <textarea
                    className="text-tool-textarea"
                    value={output}
                    readOnly
                    aria-label="Generated random values"
                />
            </div>
        </TextToolShell>
    );
}

export default RandomGenerator;

import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { safeExecute } from "../_shared/webSecurityUtils";
import {
    generateLoremParagraphs,
    generateLoremSentences,
    generateLoremWords,
} from "../_shared/generatorUtils";

function LoremIpsumGenerator() {
    const [mode, setMode] = useState("words");
    const [count, setCount] = useState(50);
    const [seed, setSeed] = useState(0);

    const result = useMemo(() => safeExecute("generate", () => {
        switch (mode) {
            case "words":
                return generateLoremWords(count);
            case "sentences":
                return generateLoremSentences(count);
            case "paragraphs":
                return generateLoremParagraphs(count, 4);
            default:
                return "";
        }
    }), [mode, count, seed]);

    const label =
        mode === "words"
            ? "Word count"
            : mode === "sentences"
              ? "Sentence count"
              : "Paragraph count";

    const output = result.ok ? result.value : "";

    return (
        <TextToolShell
            title="Lorem Ipsum Generator"
            description="Generate placeholder words, sentences, or paragraphs for design and testing."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    {[
                        ["words", "Words"],
                        ["sentences", "Sentences"],
                        ["paragraphs", "Paragraphs"],
                    ].map(([id, text]) => (
                        <button
                            key={id}
                            type="button"
                            className={`text-tool-button cursor-target${
                                mode === id ? " is-active" : ""
                            }`}
                            onClick={() => setMode(id)}
                        >
                            {text}
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

                <label className="text-tool-label" htmlFor="lorem-count">
                    {label}: {count}
                </label>
                <input
                    id="lorem-count"
                    className="text-tool-range"
                    type="range"
                    min={1}
                    max={mode === "words" ? 200 : mode === "sentences" ? 20 : 10}
                    value={count}
                    onChange={(event) => setCount(Number(event.target.value))}
                />
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Generated lorem ipsum</h2>
                    <CopyButton text={output} disabled={!result.ok} />
                </div>
                {result.error ? <p className="text-tool-empty" role="alert">{result.error}</p> : null}
                <textarea
                    className="text-tool-textarea"
                    value={output}
                    readOnly
                    aria-label="Generated lorem ipsum"
                />
            </div>
        </TextToolShell>
    );
}

export default LoremIpsumGenerator;

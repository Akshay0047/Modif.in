import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { generateUsername } from "../_shared/generatorUtils";

const STYLES = [
    { id: "adjective_noun", label: "adjective_noun" },
    { id: "adjective_noun_number", label: "adjective_noun_number" },
    { id: "camelCase", label: "camelCase" },
    { id: "dotted", label: "dotted" },
    { id: "short", label: "short" },
];

function UsernameGenerator() {
    const [style, setStyle] = useState("adjective_noun");
    const [count, setCount] = useState(5);
    const [seed, setSeed] = useState(0);

    const output = useMemo(
        () =>
            Array.from({ length: count }, () => generateUsername(style)).join("\n"),
        [style, count, seed],
    );

    return (
        <TextToolShell
            title="Username Generator"
            description="Generate random usernames with different style and word-combination patterns."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Style / pattern</h2>
                <div className="text-tool-controls">
                    {STYLES.map((entry) => (
                        <button
                            key={entry.id}
                            type="button"
                            className={`text-tool-button cursor-target${
                                style === entry.id ? " is-active" : ""
                            }`}
                            onClick={() => setStyle(entry.id)}
                        >
                            {entry.label}
                        </button>
                    ))}
                </div>

                <label className="text-tool-label" htmlFor="username-count">
                    Number of usernames: {count}
                </label>
                <input
                    id="username-count"
                    className="text-tool-range"
                    type="range"
                    min={1}
                    max={20}
                    value={count}
                    onChange={(event) => setCount(Number(event.target.value))}
                />

                <div className="text-tool-controls">
                    <button
                        type="button"
                        className="text-tool-button cursor-target"
                        onClick={() => setSeed((value) => value + 1)}
                    >
                        Regenerate
                    </button>
                </div>
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Generated usernames</h2>
                    <CopyButton text={output} />
                </div>
                <textarea
                    className="text-tool-textarea"
                    value={output}
                    readOnly
                    aria-label="Generated usernames"
                />
            </div>
        </TextToolShell>
    );
}

export default UsernameGenerator;

import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { INVISIBLE_CHARACTERS } from "../_shared/symbolData";
import {
    findInvisibleCharacters,
    visualizeInvisibleText,
} from "../_shared/unicodeUtils";

function InvisibleCharacterTools() {
    const [text, setText] = useState("");
    const [selectedChar, setSelectedChar] = useState(
        INVISIBLE_CHARACTERS[0]?.char ?? "",
    );

    const findings = useMemo(() => findInvisibleCharacters(text), [text]);
    const preview = useMemo(() => visualizeInvisibleText(text), [text]);

    return (
        <TextToolShell
            title="Invisible Character Tools"
            description="Find, inspect, and copy invisible or zero-width characters in your text."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <label
                    className="text-tool-label"
                    htmlFor="invisible-character-tools-input"
                >
                    Enter or paste your text
                </label>
                <textarea
                    id="invisible-character-tools-input"
                    className="text-tool-textarea"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Paste text that may contain hidden characters…"
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Visualized preview</h2>
                <div className="text-tool-preview-box">
                    {text ? preview : "Hidden characters will appear as labeled tokens here."}
                </div>
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">
                        Detected invisible characters
                    </h2>
                    <CopyButton
                        text={findings.map((entry) => entry.char).join("")}
                        label="Copy all found"
                        disabled={findings.length === 0}
                    />
                </div>

                {findings.length === 0 ? (
                    <p className="text-tool-empty">
                        {text
                            ? "No invisible characters detected."
                            : "Paste text above to scan for invisible characters."}
                    </p>
                ) : (
                    <div className="text-tool-table-wrap">
                        <table className="text-tool-table">
                            <thead>
                                <tr>
                                    <th>Index</th>
                                    <th>Name</th>
                                    <th>Code point</th>
                                    <th>Token</th>
                                    <th>Copy</th>
                                </tr>
                            </thead>
                            <tbody>
                                {findings.map((entry, rowIndex) => (
                                    <tr key={`${entry.index}-${entry.codePoint}-${rowIndex}`}>
                                        <td>{entry.index}</td>
                                        <td>{entry.name}</td>
                                        <td>{entry.codePoint}</td>
                                        <td>[{entry.display}]</td>
                                        <td>
                                            <CopyButton text={entry.char} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">
                    Copy selected invisible character
                </h2>
                <p className="text-tool-hint">
                    Choose a known invisible character below to copy it directly.
                </p>
                <div className="text-tool-controls">
                    {INVISIBLE_CHARACTERS.map((entry) => (
                        <button aria-pressed={selectedChar === entry.char}
                            key={entry.codePoint}
                            type="button"
                            className={`text-tool-button cursor-target${
                                selectedChar === entry.char ? " is-active" : ""
                            }`}
                            onClick={() => setSelectedChar(entry.char)}
                        >
                            {entry.name}
                        </button>
                    ))}
                </div>
                <div className="text-tool-output-header" style={{ marginTop: "0.75rem" }}>
                    <span className="text-tool-info-row__value">
                        {selectedChar
                            ? INVISIBLE_CHARACTERS.find(
                                  (entry) => entry.char === selectedChar,
                              )?.codePoint ?? "Selected character"
                            : "No character selected"}
                    </span>
                    <CopyButton text={selectedChar} label="Copy character" />
                </div>
            </div>
        </TextToolShell>
    );
}

export default InvisibleCharacterTools;

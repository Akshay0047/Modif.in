import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import {
    getCharacterInfo,
    getFirstCharacter,
} from "../_shared/unicodeUtils";

function UnicodeCharacterInfo() {
    const [input, setInput] = useState("");

    const character = useMemo(() => getFirstCharacter(input), [input]);
    const info = useMemo(() => getCharacterInfo(character), [character]);

    const infoRows = info
        ? [
              { label: "Character", value: info.character || "—" },
              { label: "Unicode name", value: info.name },
              { label: "Code point", value: info.codePoint },
              { label: "UTF-8", value: info.utf8 },
              { label: "UTF-16", value: info.utf16 },
              { label: "HTML entity", value: info.htmlEntity },
              { label: "Category", value: info.category },
          ]
        : [];

    return (
        <TextToolShell
            title="Unicode Character Info"
            description="Inspect a character's Unicode name, code point, UTF encodings, and HTML entity."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <label
                    className="text-tool-label"
                    htmlFor="unicode-character-info-input"
                >
                    Enter a character or paste text
                </label>
                <input
                    id="unicode-character-info-input"
                    aria-describedby="unicode-character-info-hint"
                    className="text-tool-input"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Type or paste a character…"
                />
                <p id="unicode-character-info-hint" className="text-tool-hint">
                    The first character in your input is analyzed automatically.
                </p>
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Character details</h2>
                    {info ? (
                        <CopyButton
                            text={`${info.character}\n${info.name}\n${info.codePoint}\nUTF-8: ${info.utf8}\nUTF-16: ${info.utf16}\nHTML: ${info.htmlEntity}`}
                            label="Copy details"
                        />
                    ) : null}
                </div>

                {!info ? (
                    <p className="text-tool-empty">
                        Enter a character above to inspect its Unicode details.
                    </p>
                ) : (
                    <div className="text-tool-info-grid">
                        {infoRows.map((row) => (
                            <div key={row.label} className="text-tool-info-row">
                                <span className="text-tool-info-row__label">
                                    {row.label}
                                </span>
                                <span className="text-tool-info-row__value">
                                    {row.value}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </TextToolShell>
    );
}

export default UnicodeCharacterInfo;

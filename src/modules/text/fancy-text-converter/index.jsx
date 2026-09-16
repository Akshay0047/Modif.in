import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { getFancyTextStyles } from "../_shared/textFormatter";

function FancyTextConverter() {
    const [text, setText] = useState("");

    const styles = useMemo(() => getFancyTextStyles(text), [text]);

    return (
        <TextToolShell
            title="Fancy Text Converter"
            description="Generate bold, italic, circled, squared, and other Unicode text styles from your input."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <label
                    className="text-tool-label"
                    htmlFor="fancy-text-converter-input"
                >
                    Enter or paste your text
                </label>
                <textarea
                    id="fancy-text-converter-input"
                    className="text-tool-textarea"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Type text to generate all fancy Unicode styles…"
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">All style outputs</h2>
                {!text.trim() ? (
                    <p className="text-tool-empty">
                        Enter text above to see every fancy style output.
                    </p>
                ) : (
                    <div className="text-tool-result-grid">
                        {styles.map((style) => (
                            <div key={style.label} className="text-tool-result-card">
                                <div className="text-tool-result-card__header">
                                    <span className="text-tool-result-card__label">
                                        {style.label}
                                    </span>
                                    <CopyButton text={style.value} />
                                </div>
                                <div className="text-tool-result-card__value">
                                    {style.value || "—"}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </TextToolShell>
    );
}

export default FancyTextConverter;

import { useMemo, useState } from "react";
import LocalMarkdown from "../../../components/LocalMarkdown";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { formatMarkdown } from "../_shared/developerUtils";

function MarkdownTools() {
    const [input, setInput] = useState(
        "# Markdown Preview\n\nWrite **bold**, _italic_, and lists here.\n\n- Item one\n- Item two",
    );
    const [showPreview, setShowPreview] = useState(true);

    const formatted = useMemo(() => formatMarkdown(input), [input]);

    return (
        <TextToolShell
            title="Markdown Tools"
            description="Format markdown source and preview rendered output."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    <button aria-pressed={showPreview}
                        type="button"
                        className={`text-tool-button cursor-target${
                            showPreview ? " is-active" : ""
                        }`}
                        onClick={() => setShowPreview((value) => !value)}
                    >
                        {showPreview ? "Hide preview" : "Show preview"}
                    </button>
                </div>
                <label className="text-tool-label" htmlFor="markdown-tools-input">
                    Markdown source
                </label>
                <textarea
                    id="markdown-tools-input"
                    className="text-tool-textarea"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Formatted markdown</h2>
                    <CopyButton text={formatted} />
                </div>
                <textarea
                    className="text-tool-textarea"
                    value={formatted}
                    readOnly
                    aria-label="Formatted markdown"
                />
            </div>

            {showPreview ? (
                <div className="text-tool-panel">
                    <h2 className="text-tool-section-title">Preview</h2>
                    <div className="text-tool-preview-box">
                        <LocalMarkdown>{input}</LocalMarkdown>
                    </div>
                </div>
            ) : null}
        </TextToolShell>
    );
}

export default MarkdownTools;

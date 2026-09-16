import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { generateSlug } from "../_shared/generatorUtils";

function SlugGenerator() {
    const [text, setText] = useState("");

    const output = useMemo(() => generateSlug(text), [text]);

    return (
        <TextToolShell
            title="Slug Generator"
            description="Convert titles and text into clean, URL-friendly slugs."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <label className="text-tool-label" htmlFor="slug-generator-input">
                    Enter title or text
                </label>
                <textarea
                    id="slug-generator-input"
                    className="text-tool-textarea"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Example: My Great Blog Post Title!"
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Generated slug</h2>
                    <CopyButton text={output} />
                </div>
                <textarea
                    className="text-tool-textarea"
                    value={output}
                    readOnly
                    aria-label="Generated slug"
                />
            </div>
        </TextToolShell>
    );
}

export default SlugGenerator;

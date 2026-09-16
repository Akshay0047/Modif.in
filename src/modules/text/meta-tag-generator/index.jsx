import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { generateMetaTags } from "../_shared/webSecurityUtils";

function MetaTagGenerator() {
    const [title, setTitle] = useState("Modif.in Text Tools");
    const [description, setDescription] = useState("Fast, private browser-based text utilities.");
    const [url, setUrl] = useState("https://modif.in/text");
    const [image, setImage] = useState("https://modif.in/og-image.png");
    const [twitterHandle, setTwitterHandle] = useState("@modifin");

    const output = useMemo(
        () => generateMetaTags({ title, description, url, image, twitterHandle }),
        [title, description, url, image, twitterHandle],
    );

    return (
        <TextToolShell title="Meta Tag Generator" description="Generate title, description, Open Graph, and Twitter/X metadata tags." leading={<BackButton />}>
            <div className="text-tool-panel">
                <div className="text-tool-grid text-tool-grid--2">
                    <input className="text-tool-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
                    <input className="text-tool-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Canonical URL" />
                    <input className="text-tool-input" value={image} onChange={(e) => setImage(e.target.value)} placeholder="Social image URL" />
                    <input className="text-tool-input" value={twitterHandle} onChange={(e) => setTwitterHandle(e.target.value)} placeholder="@twitterHandle" />
                </div>
                <textarea className="text-tool-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-output-header"><h2 className="text-tool-section-title">Generated meta tags</h2><CopyButton text={output} /></div>
                <textarea className="text-tool-textarea" value={output} readOnly />
            </div>
        </TextToolShell>
    );
}

export default MetaTagGenerator;

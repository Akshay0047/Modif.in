import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { generateSitemap } from "../_shared/webSecurityUtils";

function SitemapGenerator() {
    const [urls, setUrls] = useState(
        "https://modif.in/\nhttps://modif.in/text\nhttps://modif.in/image\nhttps://modif.in/doc",
    );

    const output = useMemo(() => generateSitemap(urls), [urls]);

    return (
        <TextToolShell title="Sitemap Generator" description="Generate a sitemap.xml file from a list of page URLs." leading={<BackButton />}>
            <div className="text-tool-panel">
                <label className="text-tool-label" htmlFor="sitemap-urls">URLs (one per line)</label>
                <textarea id="sitemap-urls" className="text-tool-textarea" value={urls} onChange={(e) => setUrls(e.target.value)} spellCheck={false} />
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-output-header"><h2 className="text-tool-section-title">sitemap.xml</h2><CopyButton text={output} /></div>
                <textarea aria-label="Generated sitemap XML" className="text-tool-textarea" value={output} readOnly />
            </div>
        </TextToolShell>
    );
}

export default SitemapGenerator;

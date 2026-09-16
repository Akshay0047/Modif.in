import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { generateRobotsTxt } from "../_shared/webSecurityUtils";

function RobotsTxtGenerator() {
    const [userAgent, setUserAgent] = useState("*");
    const [allow, setAllow] = useState("/");
    const [disallow, setDisallow] = useState("/admin\n/private");
    const [sitemap, setSitemap] = useState("https://example.com/sitemap.xml");

    const output = useMemo(
        () => generateRobotsTxt({ userAgent, allow, disallow, sitemap }),
        [userAgent, allow, disallow, sitemap],
    );

    return (
        <TextToolShell title="Robots.txt Generator" description="Generate a robots.txt file with allow, disallow, and sitemap rules." leading={<BackButton />}>
            <div className="text-tool-panel">
                <input className="text-tool-input" value={userAgent} onChange={(e) => setUserAgent(e.target.value)} placeholder="User-agent" />
                <label className="text-tool-label">Allow paths (one per line)</label>
                <textarea className="text-tool-textarea" value={allow} onChange={(e) => setAllow(e.target.value)} />
                <label className="text-tool-label">Disallow paths (one per line)</label>
                <textarea className="text-tool-textarea" value={disallow} onChange={(e) => setDisallow(e.target.value)} />
                <label className="text-tool-label">Sitemap URL</label>
                <input className="text-tool-input" value={sitemap} onChange={(e) => setSitemap(e.target.value)} />
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-output-header"><h2 className="text-tool-section-title">robots.txt</h2><CopyButton text={output} /></div>
                <textarea className="text-tool-textarea" value={output} readOnly />
            </div>
        </TextToolShell>
    );
}

export default RobotsTxtGenerator;

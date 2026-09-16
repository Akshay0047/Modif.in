import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { buildUtmUrl, cleanUtmParams, safeExecute } from "../_shared/webSecurityUtils";

function UtmBuilderCleaner() {
    const [mode, setMode] = useState("build");
    const [baseUrl, setBaseUrl] = useState("https://example.com/landing");
    const [utmSource, setUtmSource] = useState("newsletter");
    const [utmMedium, setUtmMedium] = useState("email");
    const [utmCampaign, setUtmCampaign] = useState("launch");
    const [utmTerm, setUtmTerm] = useState("");
    const [utmContent, setUtmContent] = useState("");
    const [cleanInput, setCleanInput] = useState("https://example.com/?utm_source=x&utm_medium=y&id=1");

    const built = useMemo(
        () =>
            safeExecute("build", () =>
                buildUtmUrl(baseUrl, {
                    utm_source: utmSource,
                    utm_medium: utmMedium,
                    utm_campaign: utmCampaign,
                    utm_term: utmTerm,
                    utm_content: utmContent,
                }),
            ),
        [baseUrl, utmSource, utmMedium, utmCampaign, utmTerm, utmContent],
    );

    const cleaned = useMemo(
        () => safeExecute("clean", () => cleanUtmParams(cleanInput)),
        [cleanInput],
    );

    return (
        <TextToolShell title="UTM Builder / Cleaner" description="Create UTM campaign URLs or remove UTM parameters from existing links." leading={<BackButton />}>
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    <button type="button" className={`text-tool-button cursor-target${mode === "build" ? " is-active" : ""}`} onClick={() => setMode("build")}>Build UTM URL</button>
                    <button type="button" className={`text-tool-button cursor-target${mode === "clean" ? " is-active" : ""}`} onClick={() => setMode("clean")}>Clean UTM params</button>
                </div>
                {mode === "build" ? (
                    <div className="text-tool-grid text-tool-grid--2">
                        <input className="text-tool-input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="Base URL" />
                        <input className="text-tool-input" value={utmSource} onChange={(e) => setUtmSource(e.target.value)} placeholder="utm_source" />
                        <input className="text-tool-input" value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} placeholder="utm_medium" />
                        <input className="text-tool-input" value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} placeholder="utm_campaign" />
                        <input className="text-tool-input" value={utmTerm} onChange={(e) => setUtmTerm(e.target.value)} placeholder="utm_term" />
                        <input className="text-tool-input" value={utmContent} onChange={(e) => setUtmContent(e.target.value)} placeholder="utm_content" />
                    </div>
                ) : (
                    <textarea className="text-tool-textarea" value={cleanInput} onChange={(e) => setCleanInput(e.target.value)} spellCheck={false} />
                )}
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-output-header"><h2 className="text-tool-section-title">Output</h2><CopyButton text={mode === "build" ? (built.ok ? built.value : "") : cleaned.ok ? cleaned.value : ""} disabled={mode === "build" ? !built.ok : !cleaned.ok} /></div>
                {mode === "build" ? (
                    built.error ? <p className="text-tool-empty">{built.error}</p> : <textarea className="text-tool-textarea" value={built.value} readOnly />
                ) : cleaned.error ? (
                    <p className="text-tool-empty">{cleaned.error}</p>
                ) : (
                    <textarea className="text-tool-textarea" value={cleaned.value} readOnly />
                )}
            </div>
        </TextToolShell>
    );
}

export default UtmBuilderCleaner;

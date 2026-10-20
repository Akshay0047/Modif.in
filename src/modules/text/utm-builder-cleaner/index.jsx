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
                    <button aria-pressed={mode === "build"} type="button" className={`text-tool-button cursor-target${mode === "build" ? " is-active" : ""}`} onClick={() => setMode("build")}>Build UTM URL</button>
                    <button aria-pressed={mode === "clean"} type="button" className={`text-tool-button cursor-target${mode === "clean" ? " is-active" : ""}`} onClick={() => setMode("clean")}>Clean UTM params</button>
                </div>
                {mode === "build" ? (
                    <div className="text-tool-grid text-tool-grid--2">
                        <div><label className="text-tool-label" htmlFor="utm-base-url">Base URL</label>
                        <input aria-invalid={Boolean(built.error)} aria-describedby={built.error ? "utm-base-url-error" : undefined} id="utm-base-url" className="text-tool-input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="Base URL" /></div>
                        <div><label className="text-tool-label" htmlFor="utm-source">Campaign source</label>
                        <input id="utm-source" className="text-tool-input" value={utmSource} onChange={(e) => setUtmSource(e.target.value)} placeholder="utm_source" /></div>
                        <div><label className="text-tool-label" htmlFor="utm-medium">Campaign medium</label>
                        <input id="utm-medium" className="text-tool-input" value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} placeholder="utm_medium" /></div>
                        <div><label className="text-tool-label" htmlFor="utm-campaign">Campaign name</label>
                        <input id="utm-campaign" className="text-tool-input" value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} placeholder="utm_campaign" /></div>
                        <div><label className="text-tool-label" htmlFor="utm-term">Campaign term (optional)</label>
                        <input id="utm-term" className="text-tool-input" value={utmTerm} onChange={(e) => setUtmTerm(e.target.value)} placeholder="utm_term" /></div>
                        <div><label className="text-tool-label" htmlFor="utm-content">Campaign content (optional)</label>
                        <input id="utm-content" className="text-tool-input" value={utmContent} onChange={(e) => setUtmContent(e.target.value)} placeholder="utm_content" /></div>
                    </div>
                ) : (
                    <div><label className="text-tool-label" htmlFor="utm-clean-input">URL to clean</label>
                    <textarea aria-invalid={Boolean(cleaned.error)} aria-describedby={cleaned.error ? "utm-clean-input-error" : undefined} id="utm-clean-input" className="text-tool-textarea" value={cleanInput} onChange={(e) => setCleanInput(e.target.value)} spellCheck={false} /></div>
                )}
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-output-header"><h2 className="text-tool-section-title">Output</h2><CopyButton text={mode === "build" ? (built.ok ? built.value : "") : cleaned.ok ? cleaned.value : ""} disabled={mode === "build" ? !built.ok : !cleaned.ok} /></div>
                {mode === "build" ? (
                    built.error ? <p id="utm-base-url-error" className="text-tool-empty" role="alert">{built.error}</p> : <textarea aria-label="Built UTM URL" className="text-tool-textarea" value={built.value} readOnly />
                ) : cleaned.error ? (
                    <p id="utm-clean-input-error" className="text-tool-empty" role="alert">{cleaned.error}</p>
                ) : (
                    <textarea aria-label="URL without UTM parameters" className="text-tool-textarea" value={cleaned.value} readOnly />
                )}
            </div>
        </TextToolShell>
    );
}

export default UtmBuilderCleaner;

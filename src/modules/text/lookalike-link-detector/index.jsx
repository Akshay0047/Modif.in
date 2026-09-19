import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { analyzeLookalikeInput } from "./lookalikeDetector.js";

const SAMPLE_LINKS = [
    { label: "Trusted PayPal", value: "https://www.paypal.com/signin" },
    { label: "Digit swap", value: "https://paypa1.com/login" },
    { label: "Homograph", value: "https://www.xn--80ak6aa92e.com/" },
    { label: "Subdomain trap", value: "https://apple.com.account-verify.net/login" },
    { label: "Combo-squat", value: "https://microsoft-support-login.com" },
    { label: "Google official", value: "https://accounts.google.com" },
];

function LookalikeLinkDetector() {
    const [input, setInput] = useState("https://paypa1.com/signin");

    const analysis = useMemo(() => analyzeLookalikeInput(input), [input]);
    const report = analysis.results
        .map((result) => formatReport(result))
        .join("\n\n");

    return (
        <TextToolShell
            title="Lookalike Link Detector"
            description="Check whether a URL or hostname impersonates a trusted brand through typosquatting, homoglyphs, punycode, or combo-squatting. Analysis stays in your browser."
            leading={<BackButton />}
            privacySensitive
        >
            <div className="text-tool-panel">
                <label className="text-tool-label" htmlFor="lookalike-link-input">
                    URL or hostname
                </label>
                <textarea
                    id="lookalike-link-input"
                    className="text-tool-textarea"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    spellCheck={false}
                    placeholder="Paste one or more links, or a hostname like paypa1.com"
                />
                <div className="text-tool-controls" style={{ marginTop: "0.85rem", marginBottom: 0 }}>
                    {SAMPLE_LINKS.map((sample) => (
                        <button
                            key={sample.label}
                            type="button"
                            className={`text-tool-button cursor-target${input === sample.value ? " is-active" : ""}`}
                            onClick={() => setInput(sample.value)}
                        >
                            {sample.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-stat-grid">
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">Trusted brands</span>
                        <span className="text-tool-stat__value">{analysis.stats.brandCount}</span>
                    </div>
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">Trusted domains</span>
                        <span className="text-tool-stat__value">{analysis.stats.domainCount}</span>
                    </div>
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">Links checked</span>
                        <span className="text-tool-stat__value">{analysis.results.length}</span>
                    </div>
                </div>
                <p className="text-tool-hint" style={{ marginTop: "0.85rem", marginBottom: 0 }}>
                    The trusted registry is local data, not a live blocklist. Contact us to add to the registry.
                </p>
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Analysis</h2>
                    <CopyButton text={report} disabled={!report} label="Copy report" />
                </div>
                {analysis.empty ? (
                    <p className="text-tool-empty">Paste a link to check it against the trusted registry.</p>
                ) : (
                    <div className="text-tool-result-grid">
                        {analysis.results.map((result) => (
                            <article
                                key={`${result.input}-${result.hostname}`}
                                className={`text-tool-result-card lookalike-result lookalike-result--${result.verdict.id}`}
                            >
                                <div className="text-tool-result-card__header">
                                    <span className="text-tool-result-card__label">Verdict</span>
                                    <span className={`lookalike-verdict lookalike-verdict--${result.verdict.id}`}>
                                        {result.verdict.label}
                                    </span>
                                </div>
                                <p className="lookalike-result__summary">{result.verdict.summary}</p>
                                <div className="text-tool-info-grid">
                                    <InfoRow label="Input" value={result.input} />
                                    {result.hostname ? <InfoRow label="Hostname" value={result.hostname} /> : null}
                                    {result.unicodeHost && result.unicodeHost !== result.hostname ? (
                                        <InfoRow label="Unicode host" value={result.unicodeHost} />
                                    ) : null}
                                    {result.registrableDomain ? (
                                        <InfoRow label="Registrable domain" value={result.registrableDomain} />
                                    ) : null}
                                    {result.matchedBrand ? (
                                        <InfoRow
                                            label="Closest brand"
                                            value={`${result.matchedBrand.name} (${result.matchedBrand.category})`}
                                        />
                                    ) : null}
                                </div>
                                {result.signals.length > 0 ? (
                                    <ul className="lookalike-signal-list">
                                        {result.signals.map((signal) => (
                                            <li key={`${signal.title}-${signal.detail}`}>
                                                <strong>{signal.title}.</strong> {signal.detail}
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </TextToolShell>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="text-tool-info-row">
            <span className="text-tool-info-row__label">{label}</span>
            <span className="text-tool-info-row__value">{value}</span>
        </div>
    );
}

function formatReport(result) {
    const lines = [
        `Verdict: ${result.verdict.label}`,
        `Input: ${result.input}`,
    ];
    if (result.hostname) lines.push(`Hostname: ${result.hostname}`);
    if (result.unicodeHost) lines.push(`Unicode host: ${result.unicodeHost}`);
    if (result.registrableDomain) lines.push(`Registrable domain: ${result.registrableDomain}`);
    if (result.matchedBrand) lines.push(`Closest brand: ${result.matchedBrand.name}`);
    result.signals.forEach((signal) => {
        lines.push(`- ${signal.title}: ${signal.detail}`);
    });
    return lines.join("\n");
}

export default LookalikeLinkDetector;

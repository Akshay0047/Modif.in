import { collectHomoglyphHits, hasNonAscii, toSkeleton } from "./homoglyphs.js";
import {
    getRegistrableDomain,
    getSecondLevelLabel,
} from "./publicSuffixes.js";
import { getTrustedIndex, normalizeDomain } from "./trustedBrands.js";

const DANGEROUS_SCHEMES = new Set(["javascript:", "data:", "vbscript:", "file:"]);

const PHISHING_AFFIXES = new Set([
    "account",
    "accounts",
    "admin",
    "alert",
    "app",
    "auth",
    "authenticate",
    "bank",
    "billing",
    "card",
    "center",
    "centre",
    "client",
    "com",
    "confirm",
    "customer",
    "email",
    "help",
    "http",
    "https",
    "id",
    "info",
    "inbox",
    "login",
    "logon",
    "mail",
    "mobile",
    "net",
    "notice",
    "official",
    "online",
    "org",
    "password",
    "pay",
    "payment",
    "portal",
    "recover",
    "recovery",
    "reset",
    "secure",
    "security",
    "service",
    "signin",
    "signon",
    "signup",
    "support",
    "unlock",
    "update",
    "user",
    "users",
    "validation",
    "verify",
    "verification",
    "wallet",
    "web",
    "www",
]);

const PHISHING_PREFIXES = new Set([
    ...PHISHING_AFFIXES,
    "best",
    "free",
    "get",
    "my",
    "not",
    "real",
    "true",
    "try",
]);

const URL_FINDER =
    /(?:https?:\/\/[^\s<>"'`]+)|(?:(?:xn--[a-z0-9-]+|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:xn--[a-z0-9-]+|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)){1,})/gi;

const UNICODE_URL_FINDER =
    /(?:https?:\/\/[^\s<>"'`]+)|(?:[\p{L}\p{N}][\p{L}\p{N}-]{0,61}[\p{L}\p{N}](?:\.[\p{L}\p{N}][\p{L}\p{N}-]{0,61}[\p{L}\p{N}]){1,})/gu;

export const VERDICTS = {
    trusted: {
        id: "trusted",
        label: "Trusted",
        summary: "This hostname matches an official domain in the trusted registry.",
    },
    lookalike: {
        id: "lookalike",
        label: "Lookalike",
        summary: "This hostname closely impersonates a trusted brand.",
    },
    suspicious: {
        id: "suspicious",
        label: "Suspicious",
        summary: "This hostname uses a common impersonation pattern.",
    },
    platform: {
        id: "platform",
        label: "User-hosted",
        summary: "This site is hosted on a known public platform, not an official brand domain.",
    },
    unknown: {
        id: "unknown",
        label: "Unknown",
        summary: "No trusted-brand lookalike was detected.",
    },
    invalid: {
        id: "invalid",
        label: "Invalid",
        summary: "This does not look like a usable http(s) link or hostname.",
    },
    dangerous: {
        id: "dangerous",
        label: "Dangerous",
        summary: "This uses a scheme that can execute code instead of opening a website.",
    },
};

export function extractLinkCandidates(text) {
    const source = String(text ?? "").trim();
    if (!source) return [];

    const found = new Set();
    const add = (value) => {
        const cleaned = stripTrailingPunctuation(value);
        if (cleaned) found.add(cleaned);
    };

    for (const match of source.matchAll(URL_FINDER)) {
        add(match[0]);
    }
    for (const match of source.matchAll(UNICODE_URL_FINDER)) {
        add(match[0]);
    }

    if (found.size === 0) {
        add(source.split(/\s+/)[0]);
    }

    return [...found];
}

export function analyzeLookalikeInput(text) {
    const index = getTrustedIndex();
    const candidates = extractLinkCandidates(text);

    if (candidates.length === 0) {
        return {
            empty: true,
            results: [],
            stats: {
                brandCount: index.brandCount,
                domainCount: index.domainCount,
            },
        };
    }

    const results = candidates.map((candidate) =>
        analyzeLookalikeLink(candidate, index),
    );

    return {
        empty: false,
        results,
        stats: {
            brandCount: index.brandCount,
            domainCount: index.domainCount,
        },
    };
}

export function analyzeLookalikeLink(rawInput, index = getTrustedIndex()) {
    const parsed = parseCandidate(rawInput);
    if (!parsed.ok) {
        const trapTypes = deriveTrapTypes(
            [{ title: parsed.title, detail: parsed.detail }],
            parsed.verdict,
        );
        return {
            input: rawInput,
            verdict: VERDICTS[parsed.verdict],
            trapTypes,
            primaryTrapType: trapTypes[0] ?? "Unknown",
            hostname: "",
            unicodeHost: "",
            punycodeHost: "",
            registrableDomain: "",
            matchedBrand: null,
            signals: [
                {
                    severity: parsed.verdict,
                    title: parsed.title,
                    detail: parsed.detail,
                },
            ],
            parsed,
        };
    }

    const relationship = findDomainRelationship(parsed.hostname, index);
    const signals = [];

    if (parsed.isIp) {
        signals.push({
            severity: "suspicious",
            title: "Raw IP address",
            detail: "Login and brand pages almost never use a bare IP. Treat this as unsafe unless you typed it yourself.",
        });
    }

    if (parsed.hasPunycode || parsed.hasNonAscii) {
        signals.push({
            severity: "suspicious",
            title: "Internationalized hostname",
            detail: parsed.hasPunycode
                ? `Punycode host ${parsed.punycodeHost} decodes to ${parsed.unicodeHost}.`
                : `Hostname contains non-ASCII characters: ${parsed.unicodeHost}.`,
        });
    }

    const homoglyphHits = collectHomoglyphHits(parsed.unicodeHost);
    if (homoglyphHits.length > 0) {
        const samples = homoglyphHits
            .slice(0, 6)
            .map((hit) => `'${hit.character}' → '${hit.folded}'`)
            .join(", ");
        signals.push({
            severity: "lookalike",
            title: "Lookalike characters",
            detail: `Visually confusable characters were found (${samples}).`,
        });
    }

    if (relationship?.type === "exact" || relationship?.type === "subdomain") {
        if (parsed.hasPunycode || homoglyphHits.length > 0) {
            signals.push({
                severity: "lookalike",
                title: "Trusted name with mixed scripts",
                detail: `${relationship.brand.name} appears trusted, but the hostname uses lookalike or punycode characters.`,
            });
        } else {
            return finalizeResult({
                rawInput,
                parsed,
                verdictId: "trusted",
                matchedBrand: relationship.brand,
                signals: [
                    {
                        severity: "trusted",
                        title:
                            relationship.type === "exact"
                                ? "Exact trusted domain"
                                : "Subdomain of a trusted domain",
                        detail:
                            relationship.type === "exact"
                                ? `${relationship.domain} is listed as an official ${relationship.brand.name} domain.`
                                : `${parsed.hostname} is a subdomain of official ${relationship.brand.name} domain ${relationship.domain}.`,
                    },
                ],
            });
        }
    }

    const impersonationSignals = findImpersonationSignals(parsed, index, relationship);
    signals.push(...impersonationSignals);

    if (relationship?.type === "platform" && impersonationSignals.length === 0) {
        signals.unshift({
            severity: "platform",
            title: "Known hosting platform",
            detail: `${parsed.hostname} is hosted on ${relationship.brand.name} (${relationship.domain}), not an official brand website.`,
        });
        return finalizeResult({
            rawInput,
            parsed,
            verdictId: highestSeverity(signals),
            matchedBrand: relationship.brand,
            signals,
        });
    }

    if (signals.length === 0) {
        signals.push({
            severity: "unknown",
            title: "No trusted-brand match",
            detail: "The hostname is not in the trusted registry and does not closely resemble a listed brand.",
        });
    }

    return finalizeResult({
        rawInput,
        parsed,
        verdictId: highestSeverity(signals),
        matchedBrand: pickMatchedBrand(signals, relationship),
        signals,
    });
}

function parseCandidate(rawInput) {
    const trimmed = stripTrailingPunctuation(String(rawInput ?? "").trim());
    if (!trimmed) {
        return {
            ok: false,
            verdict: "invalid",
            title: "Empty input",
            detail: "Paste a URL or hostname to analyze.",
        };
    }

    const schemeMatch = trimmed.match(/^([a-z][a-z0-9+.-]*:)/i);
    const scheme = schemeMatch ? schemeMatch[1].toLowerCase() : "";

    if (scheme && DANGEROUS_SCHEMES.has(scheme)) {
        return {
            ok: false,
            verdict: "dangerous",
            title: "Dangerous URL scheme",
            detail: `${scheme} links can run code or load local files instead of opening a website.`,
            href: trimmed,
            protocol: scheme,
        };
    }

    let href = trimmed;
    if (!scheme) {
        href = `https://${trimmed}`;
    }

    let url;
    try {
        url = new URL(href);
    } catch {
        return {
            ok: false,
            verdict: "invalid",
            title: "Could not parse URL",
            detail: "The input is not a valid URL or hostname.",
        };
    }

    if (!/^https?:$/i.test(url.protocol)) {
        return {
            ok: false,
            verdict: "invalid",
            title: "Unsupported scheme",
            detail: "Only http and https links are checked for lookalikes.",
            protocol: url.protocol,
        };
    }

    const punycodeHost = normalizeDomain(url.hostname);
    if (!punycodeHost) {
        return {
            ok: false,
            verdict: "invalid",
            title: "Missing hostname",
            detail: "The URL does not include a hostname.",
        };
    }

    const unicodeHost = decodePunycodeHost(punycodeHost);
    const isIp = isIpAddress(punycodeHost);

    return {
        ok: true,
        href: url.href,
        protocol: url.protocol,
        hostname: punycodeHost,
        punycodeHost,
        unicodeHost,
        registrableDomain: isIp ? punycodeHost : getRegistrableDomain(punycodeHost),
        sld: isIp ? "" : getSecondLevelLabel(punycodeHost),
        path: url.pathname,
        hasPunycode: /(^|\.)xn--/i.test(punycodeHost),
        hasNonAscii: hasNonAscii(unicodeHost) || hasNonAscii(trimmed),
        isIp,
    };
}

function findDomainRelationship(hostname, index) {
    const normalized = normalizeDomain(hostname);
    if (index.domainSet.has(normalized)) {
        return {
            type: "exact",
            domain: normalized,
            brand: index.domainToBrand.get(normalized),
        };
    }

    const labels = normalized.split(".").filter(Boolean);
    for (let offset = 1; offset < labels.length; offset += 1) {
        const parent = labels.slice(offset).join(".");
        if (!index.domainSet.has(parent)) continue;
        const brand = index.domainToBrand.get(parent);
        if (brand?.trustSubdomains) {
            return { type: "subdomain", domain: parent, brand };
        }
        return { type: "platform", domain: parent, brand };
    }

    return null;
}

function findImpersonationSignals(parsed, index, relationship) {
    const signals = [];
    const ignoredBrandNames = new Set(
        relationship?.brand?.name ? [relationship.brand.name] : [],
    );
    const ignoredTokens = new Set(
        relationship?.domain
            ? relationship.domain.split(".").filter(Boolean)
            : [],
    );
    const sld = parsed.sld;
    const unicodeSld = getSecondLevelLabel(parsed.unicodeHost) || sld;
    const sldSkeleton = toSkeleton(unicodeSld);
    const labels = parsed.unicodeHost.split(".").filter(Boolean);
    const asciiLabels = parsed.hostname.split(".").filter(Boolean);

    const embedded = containsTrustedDomainSequence(asciiLabels, index, ignoredBrandNames);
    if (embedded) {
        signals.push({
            severity: "lookalike",
            title: "Trusted domain used as a subdomain",
            detail: `${embedded.domain} appears inside ${parsed.hostname}, but the real site is ${embedded.brand.name}'s own domain.`,
            brand: embedded.brand,
        });
    }

    if (!sld) {
        return signals;
    }

    const exactSldBrands = (index.sldToBrands.get(sld) ?? []).filter(
        (brand) => !ignoredBrandNames.has(brand.name),
    );
    if (exactSldBrands.length > 0 && !index.domainSet.has(parsed.registrableDomain)) {
        const brand = exactSldBrands[0];
        if (relationship?.type === "platform") {
            signals.push({
                severity: "lookalike",
                title: "Brand name on a hosting platform",
                detail: `${parsed.registrableDomain} uses the ${brand.name} name on ${relationship.brand.name}, which is not ${brand.name}'s official site.`,
                brand,
            });
        } else {
            signals.push({
                severity: "suspicious",
                title: "Trusted name on a different TLD",
                detail: `${parsed.registrableDomain} uses the ${brand.name} name on a TLD that is not in the trusted registry.`,
                brand,
            });
        }
    }

    const tokenHits = findTokenImpersonation(
        sld,
        labels,
        index,
        ignoredBrandNames,
        ignoredTokens,
    );
    signals.push(...tokenHits);

    const similarityHits = findSimilarBrands(unicodeSld, sldSkeleton, index, ignoredBrandNames);
    signals.push(...similarityHits);

    return uniqueSignals(signals);
}

function containsTrustedDomainSequence(labels, index, ignoredBrandNames) {
    const maxLen = Math.min(labels.length - 1, 4);
    for (let size = maxLen; size >= 2; size -= 1) {
        for (let start = 0; start <= labels.length - size; start += 1) {
            const slice = labels.slice(start, start + size).join(".");
            if (!index.domainSet.has(slice)) continue;
            const brand = index.domainToBrand.get(slice);
            if (!brand || ignoredBrandNames.has(brand.name)) continue;
            const remainder = [...labels.slice(0, start), ...labels.slice(start + size)];
            if (remainder.length === 0) continue;
            return { domain: slice, brand };
        }
    }
    return null;
}

function findTokenImpersonation(sld, labels, index, ignoredBrandNames, ignoredTokens = new Set()) {
    const signals = [];
    const compact = sld.replace(/[-_]/g, "");

    for (const [token, brands] of index.tokenToBrands.entries()) {
        if (ignoredTokens.has(token)) continue;
        const relevant = brands.filter((brand) => !ignoredBrandNames.has(brand.name));
        if (relevant.length === 0) continue;
        const brand = relevant[0];

        if (labels.includes(token) && sld !== token) {
            signals.push({
                severity: "lookalike",
                title: "Brand name used in a subdomain",
                detail: `"${token}" appears as a hostname label, which is a common way to impersonate ${brand.name}.`,
                brand,
            });
            continue;
        }

        if (compact === token || !compact.includes(token)) {
            continue;
        }

        const indexOfToken = compact.indexOf(token);
        const before = compact.slice(0, indexOfToken);
        const after = compact.slice(indexOfToken + token.length);
        const hyphenated = hyphenWrapsToken(sld, token);
        if (isPhishingAffix(before, true) || isPhishingAffix(after, false) || hyphenated) {
            signals.push({
                severity: "suspicious",
                title: "Combo-squatting",
                detail: `${sld} combines the ${brand.name} name with extra login-style wording.`,
                brand,
            });
        }
    }

    return signals;
}

function hyphenWrapsToken(sld, token) {
    const parts = sld.split(/[-_]+/).filter(Boolean);
    return parts.includes(token) && parts.length > 1;
}

function isPhishingAffix(value, isPrefix) {
    if (!value) return false;
    if (/^\d+$/.test(value)) return true;
    const set = isPrefix ? PHISHING_PREFIXES : PHISHING_AFFIXES;
    return set.has(value);
}

function findSimilarBrands(sld, sldSkeleton, index, ignoredBrandNames) {
    const signals = [];
    const seen = new Set();

    for (const [trustedSld, brands] of index.sldToBrands.entries()) {
        if (trustedSld.length < 4) continue;
        const brand = brands.find((entry) => !ignoredBrandNames.has(entry.name));
        if (!brand || seen.has(brand.name + trustedSld)) continue;

        const trustedSkeleton = toSkeleton(trustedSld);

        if (sldSkeleton === trustedSkeleton && sld !== trustedSld) {
            seen.add(brand.name + trustedSld);
            signals.push({
                severity: "lookalike",
                title: "Homoglyph or confusable match",
                detail: `${sld} is visually equivalent to ${trustedSld} (${brand.name}) after folding lookalike characters.`,
                brand,
            });
            continue;
        }

        const typo = classifyTypo(sld, trustedSld, sldSkeleton, trustedSkeleton);
        if (!typo) continue;

        seen.add(brand.name + trustedSld);
        signals.push({
            severity: typo.severity,
            title: "Typosquat",
            detail: `${sld} looks like ${trustedSld} (${brand.name}): ${typo.reason}.`,
            brand,
        });
    }

    signals.sort((left, right) => severityRank(right.severity) - severityRank(left.severity));
    return signals.slice(0, 4);
}

function classifyTypo(sld, trustedSld, sldSkeleton, trustedSkeleton) {
    if (trustedSld.length < 5 && sld.length < 5) {
        return null;
    }

    const distance = damerauLevenshtein(sld, trustedSld);
    const skeletonDistance = damerauLevenshtein(sldSkeleton, trustedSkeleton);
    const threshold = trustedSld.length >= 10 ? 2 : 1;

    if (distance === 0) {
        return null;
    }

    if (isAdjacentTransposition(sld, trustedSld)) {
        return { severity: "lookalike", reason: "adjacent letters are swapped" };
    }

    if (Math.abs(sld.length - trustedSld.length) === 1 && distance === 1) {
        return { severity: "lookalike", reason: "one character was added or removed" };
    }

    if (sld.length === trustedSld.length && distance === 1) {
        const pair = substitutedPair(sld, trustedSld);
        if (pair && isConfusableSubstitution(pair[0], pair[1])) {
            return {
                severity: "lookalike",
                reason: `'${pair[0]}' is a lookalike for '${pair[1]}'`,
            };
        }
        if (pair && isKeyboardAdjacent(pair[0], pair[1])) {
            return {
                severity: "lookalike",
                reason: `'${pair[0]}' is next to '${pair[1]}' on a typical keyboard`,
            };
        }
        return null;
    }

    if (skeletonDistance > 0 && skeletonDistance <= threshold && sldSkeleton !== trustedSkeleton) {
        if (trustedSld.length >= 8 && skeletonDistance <= 2) {
            return { severity: "suspicious", reason: "the folded names are unusually close" };
        }
    }

    return null;
}

function isAdjacentTransposition(left, right) {
    if (left.length !== right.length) return false;
    let index = 0;
    while (index < left.length && left[index] === right[index]) index += 1;
    if (index >= left.length - 1) return false;
    if (left[index] === right[index + 1] && left[index + 1] === right[index]) {
        return left.slice(index + 2) === right.slice(index + 2);
    }
    return false;
}

function substitutedPair(left, right) {
    if (left.length !== right.length) return null;
    const diffs = [];
    for (let index = 0; index < left.length; index += 1) {
        if (left[index] !== right[index]) {
            diffs.push([left[index], right[index]]);
        }
    }
    return diffs.length === 1 ? diffs[0] : null;
}

function isConfusableSubstitution(left, right) {
    return toSkeleton(left) === toSkeleton(right);
}

const KEYBOARD_NEIGHBORS = {
    q: "wa",
    w: "qeas",
    e: "wrsd",
    r: "etdf",
    t: "ryfg",
    y: "tugh",
    u: "yihj",
    i: "uojk",
    o: "ipkl",
    p: "ol",
    a: "qwsz",
    s: "awedxz",
    d: "serfcx",
    f: "drtgvc",
    g: "ftyhbv",
    h: "gyujnb",
    j: "huiknm",
    k: "jiolm",
    l: "kop",
    z: "asx",
    x: "zsdc",
    c: "xdfv",
    v: "cfgb",
    b: "vghn",
    n: "bhjm",
    m: "njk",
    "1": "2q",
    "0": "9op",
};

function isKeyboardAdjacent(left, right) {
    const a = String(left).toLowerCase();
    const b = String(right).toLowerCase();
    return Boolean(KEYBOARD_NEIGHBORS[a]?.includes(b) || KEYBOARD_NEIGHBORS[b]?.includes(a));
}

function pickMatchedBrand(signals, relationship) {
    const hit = signals.find((signal) => signal.brand);
    return hit?.brand ?? relationship?.brand ?? null;
}

function uniqueSignals(signals) {
    const seen = new Set();
    return signals.filter((signal) => {
        const key = `${signal.severity}|${signal.title}|${signal.detail}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function finalizeResult({ rawInput, parsed, verdictId, matchedBrand, signals }) {
    const ranked = uniqueSignals(signals).sort(
        (left, right) => severityRank(right.severity) - severityRank(left.severity),
    );
    const trapTypes = deriveTrapTypes(ranked, verdictId);

    return {
        input: rawInput,
        verdict: VERDICTS[verdictId] ?? VERDICTS.unknown,
        trapTypes,
        primaryTrapType: trapTypes[0] ?? "Unknown",
        hostname: parsed.hostname,
        unicodeHost: parsed.unicodeHost,
        punycodeHost: parsed.punycodeHost,
        registrableDomain: parsed.registrableDomain,
        matchedBrand,
        signals: ranked,
        parsed,
    };
}

function highestSeverity(signals) {
    return signals.reduce((current, signal) => {
        return severityRank(signal.severity) > severityRank(current)
            ? signal.severity
            : current;
    }, "unknown");
}

const TRAP_TYPE_BY_SIGNAL = {
    "Trusted domain used as a subdomain": "Subdomain trap",
    "Brand name used in a subdomain": "Subdomain trap",
    "Homoglyph or confusable match": "Homograph",
    "Lookalike characters": "Homograph",
    "Trusted name with mixed scripts": "Homograph",
    "Internationalized hostname": "Punycode (IDN)",
    "Combo-squatting": "Combo-squat",
    "Trusted name on a different TLD": "Wrong TLD",
    "Brand name on a hosting platform": "Platform impersonation",
    "Raw IP address": "IP address",
    "Dangerous URL scheme": "Dangerous scheme",
    "Known hosting platform": "User-hosted platform",
    "Exact trusted domain": "None — trusted link",
    "Subdomain of a trusted domain": "None — trusted link",
    "No trusted-brand match": "None detected",
    "Empty input": "Invalid input",
    "Could not parse URL": "Invalid input",
    "Unsupported scheme": "Invalid input",
    "Missing hostname": "Invalid input",
};

export function deriveTrapTypes(signals, verdictId) {
    if (verdictId === "trusted") {
        return ["None — trusted link"];
    }

    const types = new Set();

    signals.forEach((signal) => {
        if (signal.title === "Typosquat") {
            if (/lookalike for|['"]?[01l|]['"]?/i.test(signal.detail)) {
                types.add("Digit swap");
            } else {
                types.add("Typosquat");
            }
            return;
        }

        const mapped = TRAP_TYPE_BY_SIGNAL[signal.title];
        if (mapped) {
            types.add(mapped);
        }
    });

    if (types.size > 0) {
        return [...types];
    }

    if (verdictId === "unknown") return ["None detected"];
    if (verdictId === "invalid") return ["Invalid input"];
    if (verdictId === "dangerous") return ["Dangerous scheme"];
    if (verdictId === "platform") return ["User-hosted platform"];
    if (verdictId === "suspicious") return ["Suspicious link"];
    if (verdictId === "lookalike") return ["Lookalike link"];

    return ["Unknown"];
}

function severityRank(id) {
    switch (id) {
        case "dangerous":
            return 6;
        case "lookalike":
            return 5;
        case "suspicious":
            return 4;
        case "invalid":
            return 3;
        case "platform":
            return 2;
        case "trusted":
            return 1;
        default:
            return 0;
    }
}

function stripTrailingPunctuation(value) {
    return String(value).replace(/[),.;:!?]+$/g, "").replace(/^[(["']+/g, "");
}

function isIpAddress(hostname) {
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
        return hostname.split(".").every((part) => Number(part) <= 255);
    }
    return hostname.startsWith("[") && hostname.endsWith("]");
}

function damerauLevenshtein(left, right) {
    if (left === right) return 0;
    if (!left) return right.length;
    if (!right) return left.length;
    if (Math.abs(left.length - right.length) > 2) {
        return 3;
    }

    const rows = left.length + 1;
    const cols = right.length + 1;
    const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));

    for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
    for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

    for (let i = 1; i < rows; i += 1) {
        for (let j = 1; j < cols; j += 1) {
            const cost = left[i - 1] === right[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost,
            );
            if (
                i > 1 &&
                j > 1 &&
                left[i - 1] === right[j - 2] &&
                left[i - 2] === right[j - 1]
            ) {
                matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
            }
        }
    }

    return matrix[left.length][right.length];
}

function decodePunycodeHost(hostname) {
    return hostname
        .split(".")
        .map((label) => {
            if (!label.toLowerCase().startsWith("xn--")) return label;
            try {
                return decodePunycodeLabel(label.slice(4));
            } catch {
                return label;
            }
        })
        .join(".");
}

function decodePunycodeLabel(input) {
    const BASE = 36;
    const TMIN = 1;
    const TMAX = 26;
    const SKEW = 38;
    const DAMP = 700;
    const INITIAL_BIAS = 72;
    const INITIAL_N = 128;
    const output = [];
    let n = INITIAL_N;
    let i = 0;
    let bias = INITIAL_BIAS;
    const delimiter = input.lastIndexOf("-");

    if (delimiter >= 0) {
        for (let index = 0; index < delimiter; index += 1) {
            const code = input.charCodeAt(index);
            if (code > 0x7f) {
                throw new Error("Invalid punycode");
            }
            output.push(input[index]);
        }
    }

    let index = delimiter >= 0 ? delimiter + 1 : 0;

    const adapt = (delta, numPoints, firstTime) => {
        let next = firstTime ? Math.floor(delta / DAMP) : delta >> 1;
        next += Math.floor(next / numPoints);
        let k = 0;
        while (next > ((BASE - TMIN) * TMAX) / 2) {
            next = Math.floor(next / (BASE - TMIN));
            k += BASE;
        }
        return k + Math.floor(((BASE - TMIN + 1) * next) / (next + SKEW));
    };

    const digitValue = (code) => {
        if (code >= 48 && code <= 57) return code - 22;
        if (code >= 65 && code <= 90) return code - 65;
        if (code >= 97 && code <= 122) return code - 97;
        throw new Error("Invalid punycode digit");
    };

    while (index < input.length) {
        const oldI = i;
        let w = 1;
        for (let k = BASE; ; k += BASE) {
            if (index >= input.length) {
                throw new Error("Invalid punycode");
            }
            const digit = digitValue(input.charCodeAt(index));
            index += 1;
            i += digit * w;
            const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
            if (digit < t) break;
            w *= BASE - t;
        }
        const out = output.length + 1;
        bias = adapt(i - oldI, out, oldI === 0);
        n += Math.floor(i / out);
        i %= out;
        output.splice(i, 0, String.fromCodePoint(n));
        i += 1;
    }

    return output.join("");
}

const TRACKING_PARAMS = new Set([
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "utm_reader",
    "utm_name",
    "utm_cid",
    "utm_referrer",
    "gclid",
    "gclsrc",
    "dclid",
    "wbraid",
    "gbraid",
    "gad_source",
    "fbclid",
    "fb_action_ids",
    "fb_action_types",
    "fb_source",
    "fb_ref",
    "mc_eid",
    "mc_cid",
    "msclkid",
    "twclid",
    "li_fat_id",
    "igshid",
    "igsh",
    "yclid",
    "srsltid",
    "epik",
    "ttclid",
    "rb_clickid",
    "irclickid",
    "irgwc",
    "clickid",
    "click_id",
    "cmpid",
    "campaignid",
    "_hsenc",
    "_hsmi",
    "hsctatracking",
    "__hstc",
    "__hssc",
    "__hsfp",
    "mkt_tok",
    "vero_id",
    "vgo_ee",
    "ref",
    "referrer",
    "referer",
    "source",
    "campaign",
    "medium",
    "content",
    "term",
    "spm",
    "scm",
    "pvid",
    "ncid",
    "affiliate",
    "aff",
    "aff_id",
    "affiliate_id",
    "partner",
    "pid",
    "pp",
    "sharer",
    "share",
    "feature",
    "kw",
    "si",
    "ved",
    "ei",
    "usg",
    "action_object_map",
    "action_type_map",
    "action_ref_map",
    "al_applink_data",
    "oly_anon_id",
    "oly_enc_id",
    "otc",
    "openct",
    "gs_lcp",
    "s_kwcid",
    "trk",
    "trkInfo",
    "sca_esv",
    "oq",
    "gs_lp",
]);

const TRACKING_PARAM_PREFIXES = [
    "utm_",
    "mt_",
    "pk_",
    "piwik_",
    "matomo_",
    "vero_",
    "vgo_",
    "_ga",
    "__",
    "hs_",
    "mkt_",
    "oly_",
];

const NOISE_PARAM_PATTERNS = [
    /\[/,
    /\]/,
    /refinement/i,
    /facetfilter/i,
    /numericfilter/i,
    /^filters?$/i,
    /^filter_/i,
    /sortby/i,
    /sort_by/i,
    /orderby/i,
    /^highlight$/i,
    /^select$/i,
    /^state$/i,
    /^config$/i,
    /^data$/i,
    /^json$/i,
    /^callback$/i,
    /^_/,
    /session/i,
    /^fb_/i,
    /^gs_/i,
    /clid$/i,
    /^redirect$/i,
    /^return_?url$/i,
    /^next$/i,
    /^modal$/i,
    /^popup$/i,
    /^overlay$/i,
    /^layout$/i,
    /^theme$/i,
    /^view$/i,
    /^tab$/i,
    /^mode$/i,
    /^toggle$/i,
    /^expanded$/i,
    /^collapsed$/i,
    /^open$/i,
    /^show$/i,
    /^hide$/i,
    /^autoplay$/i,
    /^muted$/i,
    /^controls$/i,
    /^embed$/i,
    /^widget$/i,
    /^preview$/i,
    /^nocache$/i,
    /^cachebust/i,
    /^rand(om)?$/i,
    /^timestamp$/i,
    /^_ts$/i,
    /^cb$/i,
];

const MEANINGFUL_QUERY_PARAMS = new Set([
    "id",
    "v",
    "video",
    "video_id",
    "vid",
    "t",
    "list",
    "playlist",
    "q",
    "query",
    "search",
    "s",
    "keyword",
    "keywords",
    "term",
    "page",
    "p",
    "offset",
    "limit",
    "start",
    "skip",
    "per_page",
    "lang",
    "locale",
    "l",
    "hl",
    "region",
    "slug",
    "article",
    "post",
    "story",
    "title",
    "name",
    "repo",
    "user",
    "username",
    "u",
    "path",
    "file",
    "filename",
    "doc",
    "document",
    "channel",
    "c",
    "product",
    "variant",
    "sku",
    "cat",
    "category",
    "tag",
    "year",
    "month",
    "day",
    "from",
    "to",
    "date",
    "format",
    "type",
    "ext",
    "output",
    "ll",
    "lat",
    "lng",
    "lon",
    "zoom",
    "z",
    "version",
    "ver",
    "api",
    "status",
    "tbm",
    "near",
    "place",
]);

const DOMAIN_SANITIZERS = {
    "youtube.com": sanitizeYouTubeUrl,
    "youtu.be": sanitizeYouTubeUrl,
    "google.com": sanitizeGoogleUrl,
    "amazon.com": stripAllQueryParams,
    "twitter.com": stripAllQueryParams,
    "x.com": stripAllQueryParams,
    "facebook.com": stripAllQueryParams,
    "instagram.com": stripAllQueryParams,
    "linkedin.com": stripAllQueryParams,
    "reddit.com": sanitizeRedditUrl,
};

function stripAllQueryParams(url) {
    url.search = "";
}

function sanitizeYouTubeUrl(url) {
    const kept = new URLSearchParams();
    ["v", "list", "t"].forEach((key) => {
        const value = url.searchParams.get(key);
        if (value) kept.set(key, value);
    });
    url.search = kept.toString();
}

function sanitizeGoogleUrl(url) {
    if (!/^\/search(?:\/|$)/i.test(url.pathname)) {
        return;
    }

    const kept = new URLSearchParams();
    ["q", "tbm", "near", "hl", "gl"].forEach((key) => {
        const value = url.searchParams.get(key);
        if (value) kept.set(key, value);
    });
    url.search = kept.toString();
}

function sanitizeRedditUrl(url) {
    if (/^\/r\/[^/]+\/comments\/[^/]+/i.test(url.pathname)) {
        url.search = "";
    }
}

function normalizeHostname(hostname) {
    return hostname.toLowerCase().replace(/^www\./, "");
}

function isNoiseQueryParam(key) {
    const lowerKey = key.toLowerCase();

    if (TRACKING_PARAMS.has(lowerKey)) {
        return true;
    }

    if (TRACKING_PARAM_PREFIXES.some((prefix) => lowerKey.startsWith(prefix))) {
        return true;
    }

    if (NOISE_PARAM_PATTERNS.some((pattern) => pattern.test(key))) {
        return true;
    }

    if (key.length > 48 || (key.includes("_") && key.length > 24)) {
        return true;
    }

    return false;
}

function isMeaningfulQueryParam(key) {
    const lowerKey = key.toLowerCase();
    return MEANINGFUL_QUERY_PARAMS.has(lowerKey);
}

function shouldKeepQueryParam(key) {
    if (isNoiseQueryParam(key)) {
        return false;
    }

    return isMeaningfulQueryParam(key);
}

function applyDomainSanitizer(url) {
    const host = normalizeHostname(url.hostname);
    const sanitizer = DOMAIN_SANITIZERS[host];
    if (sanitizer) {
        sanitizer(url);
    }
}

function formatSanitizedUrl(url) {
    url.hash = "";

    const serialized = url.toString();
    if (url.pathname === "/" && !url.search && !url.hash) {
        return serialized.endsWith("/") ? serialized : `${serialized}/`;
    }

    return serialized.replace(/\/$/, "");
}

export function sanitizeUrl(value) {
    const url = new URL(String(value).trim());
    const cleaned = new URLSearchParams();

    url.searchParams.forEach((paramValue, key) => {
        if (shouldKeepQueryParam(key)) {
            cleaned.set(key, paramValue);
        }
    });

    url.search = cleaned.toString();
    applyDomainSanitizer(url);
    return formatSanitizedUrl(url);
}

export function parseUrl(value) {
    const url = new URL(value);
    return {
        protocol: url.protocol,
        host: url.hostname,
        port: url.port || (url.protocol === "https:" ? "443" : "80"),
        path: url.pathname,
        query: url.search,
        fragment: url.hash,
        href: url.href,
    };
}

export function validateUrl(value) {
    const url = new URL(value);
    if (!/^https?:$/i.test(url.protocol)) {
        throw new Error("URL must use http or https.");
    }
    if (!url.hostname) {
        throw new Error("URL must include a hostname.");
    }
    return { valid: true, message: "Valid URL structure" };
}

export function buildUtmUrl(baseUrl, params) {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, item]) => {
        if (item) url.searchParams.set(key, item);
    });
    return url.toString();
}

export function cleanUtmParams(value) {
    const url = new URL(value);
    [...url.searchParams.keys()].forEach((key) => {
        if (key.toLowerCase().startsWith("utm_")) {
            url.searchParams.delete(key);
        }
    });
    return url.toString();
}

export function generateMetaTags({
    title,
    description,
    url,
    image,
    twitterHandle,
}) {
    return [
        `<title>${escapeHtml(title)}</title>`,
        `<meta name="description" content="${escapeHtml(description)}" />`,
        `<meta property="og:title" content="${escapeHtml(title)}" />`,
        `<meta property="og:description" content="${escapeHtml(description)}" />`,
        `<meta property="og:type" content="website" />`,
        url ? `<meta property="og:url" content="${escapeHtml(url)}" />` : "",
        image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : "",
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
        `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
        twitterHandle
            ? `<meta name="twitter:site" content="${escapeHtml(twitterHandle)}" />`
            : "",
        image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : "",
    ]
        .filter(Boolean)
        .join("\n");
}

export function generateRobotsTxt({
    userAgent = "*",
    allow = "",
    disallow = "",
    sitemap = "",
}) {
    const lines = [`User-agent: ${userAgent || "*"}`];
    allow
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => lines.push(`Allow: ${line}`));
    disallow
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => lines.push(`Disallow: ${line}`));
    if (sitemap.trim()) lines.push(`Sitemap: ${sitemap.trim()}`);
    return `${lines.join("\n")}\n`;
}

export function generateSitemap(urls) {
    const entries = urls
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map(
            (loc) => `  <url>\n    <loc>${escapeXml(loc)}</loc>\n  </url>`,
        )
        .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}

export function calculatePasswordStrength(password) {
    if (!password) {
        return { score: 0, label: "Empty", feedback: ["Enter a password to analyze."] };
    }

    let score = 0;
    const feedback = [];

    if (password.length >= 8) score += 1;
    else feedback.push("Use at least 8 characters.");

    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push("Add lowercase letters.");

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push("Add uppercase letters.");

    if (/\d/.test(password)) score += 1;
    else feedback.push("Add numbers.");

    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    else feedback.push("Add symbols.");

    const labels = ["Very weak", "Weak", "Fair", "Good", "Strong", "Very strong"];
    return {
        score,
        label: labels[Math.min(score, labels.length - 1)],
        feedback: feedback.length ? feedback : ["Password looks strong."],
    };
}

export function calculateEntropy(password) {
    if (!password) return { bits: 0, charsetSize: 0 };

    let charsetSize = 0;
    if (/[a-z]/.test(password)) charsetSize += 26;
    if (/[A-Z]/.test(password)) charsetSize += 26;
    if (/\d/.test(password)) charsetSize += 10;
    if (/[^A-Za-z0-9]/.test(password)) charsetSize += 32;

    const bits = charsetSize
        ? password.length * Math.log2(charsetSize)
        : 0;

    return {
        bits,
        charsetSize,
    };
}

export function detectPii(text) {
    const patterns = [
        {
            type: "Emails",
            regex: /[\w.+-]+@[\w-]+\.[\w.-]+/g,
        },
        {
            type: "URLs",
            regex: /https?:\/\/[^\s]+/g,
        },
        {
            type: "Phone numbers",
            regex: /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?)\d{3}[\s-]?\d{4}/g,
        },
        {
            type: "IP addresses",
            regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
        },
    ];

    return patterns.flatMap(({ type, regex }) =>
        [...text.matchAll(regex)].map((match) => ({
            type,
            value: match[0],
            index: match.index ?? 0,
        })),
    );
}

export async function generateHash(value, algorithm) {
    if (algorithm === "MD5") {
        return md5(value);
    }

    const digest = await crypto.subtle.digest(
        algorithm,
        new TextEncoder().encode(value),
    );

    return [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

export async function generateHmac(value, secret, algorithm = "SHA-256") {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: algorithm },
        false,
        ["sign"],
    );
    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(value),
    );

    return [...new Uint8Array(signature)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

export function safeExecute(label, fn) {
    try {
        const result = fn();
        if (result instanceof Promise) {
            return result
                .then((value) => ({ ok: true, value, error: "" }))
                .catch((error) => ({
                    ok: false,
                    value: "",
                    error: error instanceof Error ? error.message : String(error),
                }));
        }
        return { ok: true, value: result, error: "" };
    } catch (error) {
        return {
            ok: false,
            value: "",
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function escapeXml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function md5(input) {
    const bytes = new TextEncoder().encode(input);
    const words = bytesToWords(bytes);
    const padded = padMd5Words(words, bytes.length);
    let a = 1732584193;
    let b = -271733879;
    let c = -1732584194;
    let d = 271733878;

    for (let index = 0; index < padded.length; index += 16) {
        const oldA = a;
        const oldB = b;
        const oldC = c;
        const oldD = d;

        a = ff(a, b, c, d, padded[index], 7, -680876936);
        d = ff(d, a, b, c, padded[index + 1], 12, -389564586);
        c = ff(c, d, a, b, padded[index + 2], 17, 606105819);
        b = ff(b, c, d, a, padded[index + 3], 22, -1044525330);
        a = ff(a, b, c, d, padded[index + 4], 7, -176418897);
        d = ff(d, a, b, c, padded[index + 5], 12, 1200080426);
        c = ff(c, d, a, b, padded[index + 6], 17, -1473231341);
        b = ff(b, c, d, a, padded[index + 7], 22, -45705983);
        a = ff(a, b, c, d, padded[index + 8], 7, 1770035416);
        d = ff(d, a, b, c, padded[index + 9], 12, -1958414417);
        c = ff(c, d, a, b, padded[index + 10], 17, -42063);
        b = ff(b, c, d, a, padded[index + 11], 22, -1990404162);
        a = ff(a, b, c, d, padded[index + 12], 7, 1804603682);
        d = ff(d, a, b, c, padded[index + 13], 12, -40341101);
        c = ff(c, d, a, b, padded[index + 14], 17, -1502002290);
        b = ff(b, c, d, a, padded[index + 15], 22, 1236535329);

        a = gg(a, b, c, d, padded[index + 1], 5, -165796510);
        d = gg(d, a, b, c, padded[index + 6], 9, -1069501632);
        c = gg(c, d, a, b, padded[index + 11], 14, 643717713);
        b = gg(b, c, d, a, padded[index], 20, -373897302);
        a = gg(a, b, c, d, padded[index + 5], 5, -701558691);
        d = gg(d, a, b, c, padded[index + 10], 9, 38016083);
        c = gg(c, d, a, b, padded[index + 15], 14, -660478335);
        b = gg(b, c, d, a, padded[index + 4], 20, -405537848);
        a = gg(a, b, c, d, padded[index + 9], 5, 568446438);
        d = gg(d, a, b, c, padded[index + 14], 9, -1019803690);
        c = gg(c, d, a, b, padded[index + 3], 14, -187363961);
        b = gg(b, c, d, a, padded[index + 8], 20, 1163531501);
        a = gg(a, b, c, d, padded[index + 13], 5, -1444681467);
        d = gg(d, a, b, c, padded[index + 2], 9, -51403784);
        c = gg(c, d, a, b, padded[index + 7], 14, 1735328473);
        b = gg(b, c, d, a, padded[index + 12], 20, -1926607734);

        a = hh(a, b, c, d, padded[index + 5], 4, -378558);
        d = hh(d, a, b, c, padded[index + 8], 11, -2022574463);
        c = hh(c, d, a, b, padded[index + 11], 16, 1839030562);
        b = hh(b, c, d, a, padded[index + 14], 23, -35309556);
        a = hh(a, b, c, d, padded[index + 1], 4, -1530992060);
        d = hh(d, a, b, c, padded[index + 4], 11, 1272893353);
        c = hh(c, d, a, b, padded[index + 7], 16, -155497632);
        b = hh(b, c, d, a, padded[index + 10], 23, -1094730640);
        a = hh(a, b, c, d, padded[index + 13], 4, 681279174);
        d = hh(d, a, b, c, padded[index], 11, -358537222);
        c = hh(c, d, a, b, padded[index + 3], 16, -722521979);
        b = hh(b, c, d, a, padded[index + 6], 23, 76029189);
        a = hh(a, b, c, d, padded[index + 9], 4, -640364487);
        d = hh(d, a, b, c, padded[index + 12], 11, -421815835);
        c = hh(c, d, a, b, padded[index + 15], 16, 530742520);
        b = hh(b, c, d, a, padded[index + 2], 23, -995338651);

        a = ii(a, b, c, d, padded[index], 6, -198630844);
        d = ii(d, a, b, c, padded[index + 7], 10, 1126891415);
        c = ii(c, d, a, b, padded[index + 14], 15, -1416354905);
        b = ii(b, c, d, a, padded[index + 5], 21, -57434055);
        a = ii(a, b, c, d, padded[index + 12], 6, 1700485571);
        d = ii(d, a, b, c, padded[index + 3], 10, -1894986606);
        c = ii(c, d, a, b, padded[index + 10], 15, -1051523);
        b = ii(b, c, d, a, padded[index + 1], 21, -2054922799);
        a = ii(a, b, c, d, padded[index + 8], 6, 1873313359);
        d = ii(d, a, b, c, padded[index + 15], 10, -30611744);
        c = ii(c, d, a, b, padded[index + 6], 15, -1560198380);
        b = ii(b, c, d, a, padded[index + 13], 21, 1309151649);
        a = ii(a, b, c, d, padded[index + 4], 6, -145523070);
        d = ii(d, a, b, c, padded[index + 11], 10, -1120210379);
        c = ii(c, d, a, b, padded[index + 2], 15, 718787259);
        b = ii(b, c, d, a, padded[index + 9], 21, -343485551);

        a = (a + oldA) | 0;
        b = (b + oldB) | 0;
        c = (c + oldC) | 0;
        d = (d + oldD) | 0;
    }

    return [a, b, c, d].map(wordToHex).join("");
}

function bytesToWords(bytes) {
    const words = [];
    for (let index = 0; index < bytes.length; index += 1) {
        words[index >> 2] |= bytes[index] << ((index % 4) * 8);
    }
    return words;
}

function padMd5Words(words, byteLength) {
    const padded = [...words];
    padded[byteLength >> 2] |= 0x80 << ((byteLength % 4) * 8);
    padded[(((byteLength + 8) >>> 6) << 4) + 14] = byteLength * 8;
    while (padded.length % 16 !== 0) padded.push(0);
    return padded;
}

function wordToHex(value) {
    let hex = "";
    for (let index = 0; index < 4; index += 1) {
        hex += ((value >> (index * 8)) & 255).toString(16).padStart(2, "0");
    }
    return hex;
}

function cmn(q, a, b, x, s, t) {
    a = (a + q + x + t) | 0;
    return (((a << s) | (a >>> (32 - s))) + b) | 0;
}

function ff(a, b, c, d, x, s, t) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
}

function gg(a, b, c, d, x, s, t) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
}

function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
}

function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
}

import { textToolsData } from "./textTools.js";
import { imageToolsData } from "./imageTools.js";
import { docToolsData } from "./docTools.js";
import { getRouteStructuredData } from "./routeStructuredData.js";

export const SITE_ORIGIN = "https://modif.in";

const NOT_FOUND_TITLE = "Page not found | Modif";
const NOT_FOUND_DESCRIPTION = "This address is not a Modif page. Browse the text, image, and document tools from the homepage.";

const STATIC_PAGES = {
    "/": {
        title: "Modif – Free Online Image, Text & Document Tools",
        description: "Use free online tools to edit images, format text, and work with PDF, DOCX and CSV files. Simple browser-based utilities with privacy-focused processing.",
    },
    "/text": {
        title: "Text Tools – Free Online Text & Developer Utilities | Modif",
        description: "Explore free online text tools for formatting, text analysis, encoding, conversion and developer tasks. Quickly process text in your browser with Modif.",
    },
    "/doc": {
        title: "PDF & Document Tools – Free Online File Utilities | Modif",
        description: "Use free online PDF, DOCX and CSV tools to convert, organize, repair, redact and modify documents. Explore browser-based document utilities on Modif.",
    },
    "/image": {
        title: "Image Tools – Free Online Image Converter & Editor | Modif",
        description: "Compress, convert, resize, crop and edit images with free online image tools. Explore useful image utilities on Modif.",
    },
};

const TITLE_OVERRIDES = {
    "/text/base64-encoder-decoder": "Base64 Encode and Decode Text | Modif",
    "/text/code-minifier": "Code Minifier for JS, CSS, HTML, and JSON | Modif",
    "/text/text-comparison": "Compare Two Texts | Modif",
    "/text/line-tools": "Sort, Split, and Deduplicate Lines | Modif",
    "/text/prefix-suffix": "Add Prefixes and Suffixes to Lines | Modif",
    "/text/json-tools": "Format, Validate, and Convert JSON | Modif",
    "/text/xml-tools": "Format, Validate, and Minify XML | Modif",
    "/text/markdown-tools": "Format and Preview Markdown | Modif",
    "/text/token-generator": "Generate API and Hex Tokens | Modif",
    "/text/test-data-generator": "Generate Dummy Test Values | Modif",
    "/text/fake-data-generator": "Generate Sample Names and Addresses | Modif",
    "/text/random-generator": "Generate Random Words and Numbers | Modif",
    "/image/base64-encoder-decoder": "Base64 Encode and Decode Images | Modif",
    "/image/watermark-image": "Watermark an Image | Modif",
    "/image/filters-effects": "Apply Photo Filters and Effects | Modif",
    "/image/color-adjustments": "Adjust Image Brightness and Color | Modif",
    "/image/bulk-image-processor": "Resize and Convert Images in Bulk | Modif",
    "/doc/watermarking": "PDF Watermarking | Modif",
    "/doc/ocr": "OCR for Scanned Images and PDFs | Modif",
    "/doc/ebook-conversion": "EPUB E-Book Conversion | Modif",
    "/doc/redaction-tool": "Redact PDF Content | Modif",
    "/doc/to-pdf": "Convert Files to PDF | Modif",
    "/doc/from-pdf": "Extract Text or Images from a PDF | Modif",
    "/doc/document-comparison": "Compare PDF and DOCX Text | Modif",
    "/doc/text-extractor": "Extract Embedded PDF and Word Text | Modif",
    "/doc/repair-document": "Repair a Damaged PDF | Modif",
    "/doc/pagination-layout": "Add PDF Headers, Footers, and Page Numbers | Modif",
    "/doc/asset-extractor": "Extract Images Embedded in a PDF | Modif",
    "/doc/pdf-security": "Add or Remove a PDF Password | Modif",
    "/doc/metadata-stripper": "Remove PDF Document Metadata | Modif",
    "/doc/pdf-flattening": "Flatten PDF Forms and Annotations | Modif",
    "/doc/archival-conversion": "Make a Static Archival PDF | Modif",
    "/doc/fillable-form-tools": "Fill PDF AcroForm Fields | Modif",
    "/doc/batch-workflow-automation": "Run a Sequence of PDF Tools | Modif",
};

const DESCRIPTIONS = {
    "/text/text-counter": "Measure words, characters, sentences, paragraphs, and lines as you type.",
    "/text/text-comparison": "Compare two texts side by side with word-level or character-level differences.",
    "/text/text-statistics": "See averages, word frequency, and basic readability metrics for a piece of text.",
    "/text/reading-speaking-time": "Estimate how long a passage takes to read or speak at a speed you choose.",
    "/text/duplicate-finder": "Find repeated words, sentences, and lines in a block of text.",
    "/text/whitespace-analyzer": "Inspect leading, trailing, consecutive, and unusual whitespace, including tabs.",
    "/text/case-converter": "Convert text to upper, lower, title, sentence, alternating, or inverse case.",
    "/text/text-cleaner": "Remove extra spaces, empty lines, punctuation, numbers, or other unwanted characters.",
    "/text/fancy-text-converter": "Turn plain text into bold, italic, circled, squared, and other Unicode styles.",
    "/text/code-case-converter": "Convert phrases into camelCase, snake_case, kebab-case, and other code naming styles.",
    "/text/line-tools": "Sort, reverse, shuffle, deduplicate, join, or split lines of text.",
    "/text/text-reverser": "Reverse a whole passage, each word, or the characters in the text.",
    "/text/prefix-suffix": "Add a prefix, suffix, number, wrapper, or indent to each line.",
    "/text/find-replace": "Find and replace text, including regular expressions and more than one replacement.",
    "/text/json-tools": "Format, minify, validate, and sort JSON, or convert it to YAML or CSV.",
    "/text/code-formatter": "Pretty-print JavaScript, TypeScript, HTML, CSS, SQL, JSON, and XML.",
    "/text/jwt-decoder": "Decode a JSON Web Token and inspect its header, payload, expiration, and claims.",
    "/text/code-minifier": "Minify JavaScript, CSS, HTML, and JSON by removing unnecessary whitespace.",
    "/text/regex-tester": "Test a regular expression, inspect matches and capture groups, and preview replacements.",
    "/text/markdown-tools": "Format Markdown source and preview how it renders.",
    "/text/timestamp-converter": "Convert Unix timestamps to ISO dates and back again.",
    "/text/xml-tools": "Format, validate, and minify XML documents.",
    "/text/html-entity-tools": "Encode text as HTML entities and decode entities back to readable text.",
    "/text/query-string-tools": "Parse a query string into JSON and build a query string from values.",
    "/text/password-generator": "Generate passwords and passphrases with a length and character set you choose.",
    "/text/lorem-ipsum-generator": "Generate placeholder words, sentences, or paragraphs for layouts and drafts.",
    "/text/uuid-id-generator": "Generate UUID, ULID, and NanoID identifiers.",
    "/text/username-generator": "Generate usernames from different styles and word combinations.",
    "/text/fake-data-generator": "Generate sample names, emails, phone numbers, addresses, companies, and dates.",
    "/text/random-generator": "Generate random words, numbers, sentences, and names.",
    "/text/slug-generator": "Turn a title into a lowercase, URL-friendly slug.",
    "/text/token-generator": "Generate random strings, API-style tokens, and hex tokens.",
    "/text/test-data-generator": "Generate simple dummy values for quick developer testing.",
    "/text/base64-encoder-decoder": "Encode text to Base64 and decode Base64 back to text.",
    "/text/url-encoder-decoder": "Encode and decode individual parts of a URL, such as a path segment or query value.",
    "/text/binary-text": "Convert text to UTF-8 binary bytes and decode those bytes back to text.",
    "/text/hex-text": "Convert text to UTF-8 hexadecimal bytes and decode those bytes back to text.",
    "/text/ascii-converter": "Convert ASCII characters to decimal, hexadecimal, and 8-bit binary codes.",
    "/text/number-base-converter": "Convert numbers between binary, decimal, hexadecimal, and octal.",
    "/text/morse-code-converter": "Convert text to Morse code and Morse code back to text.",
    "/text/unicode-escape-converter": "Convert text to Unicode escape sequences and back again.",
    "/text/classical-cipher-tools": "Apply ROT13, Caesar, and Atbash transformations to text.",
    "/text/roman-numeral-converter": "Convert numbers to Roman numerals and Roman numerals back to numbers.",
    "/text/hash-generator": "Generate MD5, SHA-1, SHA-256, and SHA-512 hashes from text.",
    "/text/password-strength-checker": "Check a password's length, character variety, and estimated strength.",
    "/text/url-sanitizer": "Remove recognized tracking parameters from a URL while keeping the rest of the link.",
    "/text/url-parser": "Split a URL into its protocol, host, port, path, query, and fragment.",
    "/text/url-validator": "Check whether a URL has a valid basic structure.",
    "/text/lookalike-link-detector": "Check a URL or hostname for typosquatting, homoglyphs, punycode, and combo-squatting.",
    "/text/utm-builder-cleaner": "Build a campaign URL with UTM parameters or remove UTM parameters from a link.",
    "/text/meta-tag-generator": "Generate title, description, Open Graph, and Twitter card tags from the details you enter.",
    "/text/robots-txt-generator": "Generate a robots.txt file with allow, disallow, and sitemap rules.",
    "/text/sitemap-generator": "Generate a sitemap.xml file from a list of page URLs.",
    "/text/entropy-calculator": "Estimate password entropy from length and character-set size.",
    "/text/hmac-generator": "Generate an HMAC signature from a message and a secret key.",
    "/text/pii-detector": "Find emails, URLs, phone numbers, and IP addresses in text.",
    "/text/special-character-picker": "Browse and copy special characters from organized categories.",
    "/text/invisible-character-tools": "Find, inspect, and copy invisible or zero-width characters in text.",
    "/text/ascii-kaomoji": "Browse ASCII emojis, kaomoji, and emoticons you can copy in one line.",
    "/text/unicode-symbol-picker": "Copy arrows, math symbols, currency signs, Greek letters, and shapes.",
    "/text/unicode-character-info": "Look up a character's Unicode name, code point, UTF encodings, and HTML entity.",
    "/text/separators-dividers": "Copy decorative text dividers for posts, bios, notes, and messages.",
    "/image/compress-image": "Reduce an image's file size by re-encoding it at a lower quality.",
    "/image/compress-to-target-size": "Compress an image toward a file size you choose.",
    "/image/bulk-image-processor": "Resize, recompress, and convert several images to JPG, PNG, or WEBP, then download a ZIP.",
    "/image/convert-to-jpg-png": "Convert PNG, JPG, WEBP, BMP, or GIF images to JPG or PNG. The tool accepts files up to 30 MB.",
    "/image/heic-to-jpg": "Convert HEIC or HEIF photos to JPG in the browser.",
    "/image/image-to-pdf": "Place one or more images onto the pages of a PDF.",
    "/image/webp-converter": "Convert PNG, JPG, WEBP, BMP, or GIF images to WEBP, or convert a WEBP image to PNG or JPG.",
    "/image/svg-to-png-jpg": "Rasterize an SVG file to a PNG or JPG image.",
    "/image/gif-frame-extractor-converter": "Extract frames from a GIF and download them as PNG or JPG images, including a ZIP of every frame.",
    "/image/crop-resize": "Crop an image and change its pixel dimensions.",
    "/image/rotate-flip": "Rotate an image or flip it horizontally or vertically.",
    "/image/color-adjustments": "Adjust brightness, contrast, and saturation, and compare the result with the original.",
    "/image/filters-effects": "Apply color, monochrome, and artistic filters such as sepia, duotone, pixelate, and vignette.",
    "/image/blur-censor": "Blur part of an image to hide a sensitive detail.",
    "/image/profile-picture-maker": "Scale and rotate a photo, then export a square PNG profile image.",
    "/image/watermark-image": "Add a text or logo watermark to an image and choose where it sits.",
    "/image/meme-generator": "Add caption text to an image and download the finished meme.",
    "/image/image-splitter": "Split one image into a grid of tiles and download the tiles together.",
    "/image/image-stitcher": "Join images vertically or horizontally into one picture and download the result.",
    "/image/device-mockup-generator": "Place a screenshot inside a device frame.",
    "/image/favicon-generator": "Create favicon image sizes and copy the link tags for the sizes you select.",
    "/image/exif-data-viewer-stripper": "View the EXIF metadata on a photo and remove it before you download.",
    "/image/base64-encoder-decoder": "Encode an image as Base64, or turn a Base64 image string back into a picture.",
    "/image/color-palette-extractor": "Pick the main colors from an image and copy their color values.",
    "/image/placeholder-image-generator": "Create a placeholder image with the size, label, and background you choose.",
    "/doc/pdf-merger": "Combine PDF files into one document and reorder them before you download.",
    "/doc/pdf-splitter": "Preview PDF pages and save a selected page range as a new PDF.",
    "/doc/page-organizer": "Reorder, rotate, and delete pages in a PDF.",
    "/doc/pdf-compressor": "Re-encode PDF pages at lower quality to reduce the file size.",
    "/doc/pdf-flattening": "Flatten form fields, annotations, and other interactive PDF layers into static content.",
    "/doc/pagination-layout": "Add a header, footer, and page numbers to every page of a PDF.",
    "/doc/repair-document": "Rebuild a damaged PDF cross-reference table and recover pages that can still be read.",
    "/doc/batch-workflow-automation": "Run several PDF operations in sequence, preview the file, and download it once.",
    "/doc/to-pdf": "Convert PNG, JPEG, WebP, TXT, DOCX, and ODT files into a PDF. Save legacy .doc files as .docx first.",
    "/doc/from-pdf": "Extract text, Markdown, or page images from a PDF.",
    "/doc/ebook-conversion": "Convert an EPUB e-book to plain text or a PDF.",
    "/doc/archival-conversion": "Remove scripts, interactive elements, and metadata to make a simpler archival PDF.",
    "/doc/pdf-editor": "Add text, drawings, highlights, and pictures to PDF pages, then save a new file.",
    "/doc/e-signature": "Draw a signature or place a picture, then position it on a PDF page.",
    "/doc/fillable-form-tools": "Fill AcroForm text fields and checkboxes, then save the PDF. Other field types cannot be edited here.",
    "/doc/document-comparison": "Compare the extracted text of two PDF or DOCX files side by side.",
    "/doc/ocr": "Recognize text in a scanned image or PDF. This reads the picture of the page, not a hidden text layer.",
    "/doc/text-extractor": "Extract embedded text from a PDF or Word document. A scanned page without a text layer needs OCR instead.",
    "/doc/table-extractor": "Detect grid-aligned text in a PDF and export it as CSV or JSON, with the page number kept.",
    "/doc/asset-extractor": "Collect images embedded in a PDF and download them in a ZIP file.",
    "/doc/redaction-tool": "Cover sensitive PDF content. Pages are saved as images so the covered source text is not left in the file.",
    "/doc/watermarking": "Stamp text across every page of a PDF and preview the pages before you download.",
    "/doc/pdf-security": "Add or remove PDF password protection and change the file's permission restrictions.",
    "/doc/metadata-stripper": "View a PDF document-info dictionary and remove that metadata.",
    "/doc/csv-converter": "Convert a CSV file to JSON, XML, or an Excel workbook.",
    "/doc/csv-editor-transformer": "Filter, search, deduplicate, and reorder CSV columns before you export.",
    "/doc/table-to-markdown": "Convert a CSV or Excel table into a GitHub-flavored Markdown table.",
};

function catalogTools() {
    return [textToolsData, imageToolsData, docToolsData].flatMap((groups) =>
        groups.flatMap((group) => group.tools),
    );
}

function canonicalFor(path) {
    return path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
}

function buildPages() {
    const tools = catalogTools();
    const missing = tools.filter((tool) => !DESCRIPTIONS[tool.path]);
    if (missing.length > 0) {
        throw new Error(`Missing route descriptions: ${missing.map((tool) => tool.path).join(", ")}`);
    }

    const pages = new Map(Object.entries(STATIC_PAGES));
    for (const tool of tools) {
        pages.set(tool.path, {
            title: TITLE_OVERRIDES[tool.path] ?? `${tool.name} | Modif`,
            description: DESCRIPTIONS[tool.path],
        });
    }

    const titles = new Map();
    const descriptions = new Map();
    for (const [path, page] of pages) {
        if (titles.has(page.title)) {
            throw new Error(`Duplicate title for ${path} and ${titles.get(page.title)}: ${page.title}`);
        }
        if (descriptions.has(page.description)) {
            throw new Error(`Duplicate description for ${path} and ${descriptions.get(page.description)}`);
        }
        titles.set(page.title, path);
        descriptions.set(page.description, path);
    }

    return pages;
}

const pages = buildPages();

export function normalizePathname(pathname) {
    let path;
    try {
        path = decodeURI(pathname).replace(/\/+$/, "").toLowerCase() || "/";
    } catch {
        path = String(pathname || "/");
    }
    if (!path.startsWith("/")) path = `/${path}`;
    return path;
}

export function getRouteMeta(pathname) {
    const path = normalizePathname(pathname);
    const page = pages.get(path);
    if (!page) {
        return {
            path,
            title: NOT_FOUND_TITLE,
            description: NOT_FOUND_DESCRIPTION,
            canonical: null,
        };
    }
    return {
        path,
        title: page.title,
        description: page.description,
        canonical: canonicalFor(path),
    };
}

export function getIndexableRoutes() {
    return [...pages.entries()]
        .map(([path, page]) => ({
            path,
            title: page.title,
            description: page.description,
            canonical: canonicalFor(path),
        }))
        .sort((left, right) => left.path.localeCompare(right.path));
}

function upsertMeta(attr, key, content) {
    const selector = `meta[${attr}="${key}"]`;
    let element = document.head.querySelector(selector);
    if (!content) {
        element?.remove();
        return;
    }
    if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, key);
        document.head.appendChild(element);
    }
    element.setAttribute("content", content);
}

export function applyDocumentMeta(meta) {
    if (typeof document === "undefined") return;
    document.title = meta.title;
    upsertMeta("name", "description", meta.description);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", "MODIF.in");
    upsertMeta("property", "og:title", meta.title);
    upsertMeta("property", "og:description", meta.description);
    upsertMeta("property", "og:url", meta.canonical);
    upsertMeta("name", "twitter:card", "summary");
    upsertMeta("name", "twitter:title", meta.title);
    upsertMeta("name", "twitter:description", meta.description);
    upsertMeta("name", "robots", meta.canonical ? "index,follow" : "noindex");

    const structuredData = getRouteStructuredData(meta);
    const existingData = document.getElementById("route-structured-data");
    if (structuredData) {
        const script = existingData ?? document.head.appendChild(document.createElement("script"));
        script.id = "route-structured-data";
        script.type = "application/ld+json";
        script.textContent = JSON.stringify(structuredData).replace(/</g, "\\u003c");
    } else {
        existingData?.remove();
    }

    const links = [...document.head.querySelectorAll('link[rel="canonical"]')];
    if (!meta.canonical) {
        links.forEach((link) => link.remove());
        return;
    }
    const [link, ...extras] = links;
    extras.forEach((extra) => extra.remove());
    const canonical = link ?? document.head.appendChild(document.createElement("link"));
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", meta.canonical);
}

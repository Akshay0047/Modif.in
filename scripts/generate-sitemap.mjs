/**
 * Generates public/sitemap.xml from the same module folder → URL rules as src/App.jsx.
 */
import { readdir, writeFile, access } from "fs/promises";
import { constants } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const modulesDir = join(root, "src", "modules");

const SITE_ORIGIN = "https://modif.in";

const MODULE_PREFIX = {
    text: "text",
    image: "image",
    docs: "doc",
};

const HUB_PATHS = ["/", "/image", "/text", "/doc"];

function escapeXml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function toAbsoluteUrl(path) {
    if (path === "/") {
        return `${SITE_ORIGIN}/`;
    }
    return `${SITE_ORIGIN}${path}`;
}

async function fileExists(path) {
    try {
        await access(path, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

async function collectToolPaths() {
    const paths = [];
    const moduleNames = await readdir(modulesDir);

    for (const moduleName of moduleNames) {
        if (moduleName.startsWith("_")) continue;

        const prefix = MODULE_PREFIX[moduleName];
        if (!prefix) continue;

        const modulePath = join(modulesDir, moduleName);
        const entries = await readdir(modulePath, { withFileTypes: true });

        for (const entry of entries) {
            if (!entry.isDirectory() || entry.name.startsWith("_")) continue;

            const indexPath = join(modulePath, entry.name, "index.jsx");
            if (!(await fileExists(indexPath))) continue;

            paths.push(`/${prefix}/${entry.name}`);
        }
    }

    return paths.sort((a, b) => a.localeCompare(b));
}

function buildSitemapXml(urls) {
    const urlEntries = urls
        .map((path) => {
            const loc = escapeXml(toAbsoluteUrl(path));
            return `  <url>\n    <loc>${loc}</loc>\n  </url>`;
        })
        .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;
}

async function main() {
    const toolPaths = await collectToolPaths();
    const paths = [...HUB_PATHS, ...toolPaths];

    const xml = buildSitemapXml(paths);
    const outPath = join(root, "public", "sitemap.xml");
    await writeFile(outPath, xml, "utf8");

    console.log(`Generated sitemap with ${paths.length} URLs → public/sitemap.xml`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

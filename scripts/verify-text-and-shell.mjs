import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const browserMode = process.argv.includes("--browser");
const tests = readdirSync(new URL("../tests/text-and-shell/", import.meta.url)).filter((name) =>
    name.endsWith(".mjs") && (browserMode ? !name.endsWith(".test.mjs") && name !== "browserHarness.mjs" : name.endsWith(".test.mjs")),
).sort();
const env = { ...process.env };

if (browserMode) {
    const normalize = (value) => value.startsWith("file:") ? value : pathToFileURL(value).href;
    const playwright = normalize(env.PLAYWRIGHT_MODULE || fileURLToPath(import.meta.resolve("playwright")));
    const axe = normalize(env.AXE_MODULE || fileURLToPath(import.meta.resolve("@axe-core/playwright")));
    env.PLAYWRIGHT_MODULE = env.MODIF_PLAYWRIGHT_MODULE = playwright;
    env.AXE_MODULE = env.MODIF_AXE_MODULE = env.AXE_PLAYWRIGHT_MODULE = axe;
    env.MODIF_BASE_URL = env.MODIF_QA_URL = env.TEST_BASE_URL = env.MODIF_BASE_URL || "http://127.0.0.1:4173";
}

const args = browserMode ? null : ["--test", "--test-concurrency=1", ...tests.map((name) => `tests/text-and-shell/${name}`)];
const batches = browserMode ? tests.map((name) => [`tests/text-and-shell/${name}`]) : [args];
for (const batch of batches) {
    console.log(`Running ${batch.join(" ")}`);
    const result = spawnSync(process.execPath, batch, { cwd: root, env, stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`${tests.length} ${browserMode ? "browser suites" : "unit test files"} passed.`);

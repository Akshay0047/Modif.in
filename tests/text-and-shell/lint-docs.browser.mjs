import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(
  modulePath
    ? modulePath.startsWith("file:")
      ? modulePath
      : pathToFileURL(modulePath).href
    : "playwright"
);
const root = fileURLToPath(new URL("../../", import.meta.url)).replaceAll(
  "\\",
  "/",
);
const require = createRequire(import.meta.url);
const { PDFDocument, rgb } = require("pdf-lib");
const pdf = await PDFDocument.create();
const pg = pdf.addPage([200, 150]);
pg.drawRectangle({
  x: 20,
  y: 20,
  width: 150,
  height: 100,
  color: rgb(0.1, 0.2, 0.9),
});
const bytes = await pdf.save();
const dir = await fs.mkdtemp(path.join(tmpdir(), "modif-pdf-preview-"));
await fs.writeFile(
  path.join(dir, "index.html"),
  '<html><body><div id="root"></div><script type="module" src="/main.jsx"></script></body></html>',
);
await fs.writeFile(
  path.join(dir, "main.jsx"),
  `import React,{StrictMode,useState} from 'react';
import {createRoot} from 'react-dom/client';
import PdfPreview from '/@fs/${root}/src/modules/docs/_shared/PdfPreview.jsx';
import * as pdfjs from '/@fs/${root}/node_modules/pdfjs-dist/build/pdf.mjs';
import worker from '/@fs/${root}/node_modules/pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc=worker;
const valid=Uint8Array.from(${JSON.stringify([...bytes])});const padded=new Uint8Array(valid.length+10);padded.set(valid,5);const view=padded.subarray(5,5+valid.length);const file=new Blob([valid],{type:'application/pdf'});
const broken=new ArrayBuffer(1);structuredClone(broken,{transfer:[broken]});
window.previewResources=[];const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=blob=>{const url=create(blob);if(blob.type==='application/pdf')window.previewResources.push({url,blob,revoked:false});return url};
URL.revokeObjectURL=url=>{const r=window.previewResources.find(r=>r.url===url);if(r)r.revoked=true;revoke(url)};
window.renderPreview=async()=>{const url=document.querySelector('iframe').src;const data=new Uint8Array(await(await fetch(url)).arrayBuffer());const length=data.length;const doc=await pdfjs.getDocument({data}).promise;const page=await doc.getPage(1);const canvas=document.createElement('canvas');const viewport=page.getViewport({scale:1});canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;document.body.append(canvas);const pixel=[...canvas.getContext('2d').getImageData(50,50,1,1).data];await doc.destroy();return {pixel,length}};
function App(){const[source,setSource]=useState({bytes:view});const[mounted,setMounted]=useState(true);const[n,setN]=useState(0);return <><button onClick={()=>setSource({bytes:view})}>Valid bytes</button><button onClick={()=>setSource({bytes:broken,file})}>Use Blob</button><button onClick={()=>setSource({bytes:broken})}>Broken input</button><button onClick={()=>setSource({})}>Clear</button><button onClick={()=>setMounted(false)}>Unmount</button><button onClick={()=>setMounted(true)}>Remount</button><button onClick={()=>setN(n+1)}>Unrelated render</button><span>{n}</span>{mounted&&<PdfPreview {...source}/>}</>};createRoot(document.getElementById('root')).render(<StrictMode><App/></StrictMode>);`,
);
const server = await createServer({
  configFile: false,
  root: dir,
  plugins: [react()],
  resolve: {
    alias: [
      { find: "react-dom", replacement: root + "/node_modules/react-dom" },
      { find: "react", replacement: root + "/node_modules/react" },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 0,
    strictPort: true,
    fs: { allow: [dir, root] },
  },
});
await server.listen();
const baseURL = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(7000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  const frame = page.getByTitle("PDF preview");
  await frame.waitFor();
  const active = () =>
    page.evaluate(
      () => window.previewResources.filter((r) => !r.revoked).length,
    );
  assert.equal(await active(), 1);
  const resources = await page.evaluate(() => window.previewResources.length);
  assert.ok(
    resources >= 2,
    "StrictMode subscribes, unsubscribes, and subscribes again",
  );
  const rendered = await page.evaluate(() => window.renderPreview());
  assert.equal(rendered.length, bytes.length);
  assert.ok(
    rendered.pixel[2] > rendered.pixel[0] + 100,
    "PDF preview Blob independently renders the expected blue rectangle",
  );
  await page
    .getByRole("button", { name: "Unrelated render", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => window.previewResources.length),
    resources,
  );
  await page.getByRole("button", { name: "Use Blob", exact: true }).click();
  await frame.waitFor();
  assert.equal(await active(), 1);
  assert.equal(await page.locator(".doc-tool-status--error").count(), 0);
  await page.getByRole("button", { name: "Broken input", exact: true }).click();
  await page.locator(".doc-tool-status--error").waitFor();
  assert.equal(await frame.count(), 0);
  assert.equal(await active(), 0);
  await page.getByRole("button", { name: "Valid bytes", exact: true }).click();
  await frame.waitFor();
  assert.equal(await page.locator(".doc-tool-status--error").count(), 0);
  assert.equal(await active(), 1);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector("iframe"));
  assert.equal(await active(), 0);
  await page.getByRole("button", { name: "Valid bytes", exact: true }).click();
  await frame.waitFor();
  await page.getByRole("button", { name: "Unmount", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector("iframe"));
  assert.equal(await active(), 0);
  await page.getByRole("button", { name: "Remount", exact: true }).click();
  await frame.waitFor();
  assert.equal(await active(), 1);
  await page.getByRole("button", { name: "Unmount", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector("iframe"));
  assert.equal(await active(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PdfPreview StrictMode real-PDF lifecycle passed: typed-view bytes, independent PDF.js render, Blob precedence, stable unrelated renders, error/recovery, clear/unmount/remount, all URLs revoked.",
  );
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
  const resolved = path.resolve(dir);
  assert.ok(
    resolved.startsWith(path.resolve(tmpdir()) + path.sep) &&
      path.basename(resolved).startsWith("modif-pdf-preview-"),
  );
  await fs.rm(resolved, { recursive: true, force: true });
}

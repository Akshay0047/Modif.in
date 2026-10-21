import { access, readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { getRouteMeta } from "../src/data/routeMeta.js";
import { buildRoutePages, renderRouteHtml, routeHtmlFile } from "./routeMetaHead.js";

export function routeMetaPlugin() {
    return {
        name: "modif-route-meta",
        enforce: "post",
        transformIndexHtml(html, context) {
            return renderRouteHtml(html, getRouteMeta(context.server ? context.path : "/"));
        },
        generateBundle: {
            order: "post",
            handler(_options, bundle) {
                const index = bundle["index.html"];
                if (!index || typeof index.source !== "string") throw new Error("Missing built index.html");
                for (const [fileName, source] of buildRoutePages(index.source)) {
                    if (fileName === "index.html") index.source = source;
                    else this.emitFile({ type: "asset", fileName, source });
                }
            },
        },
        configurePreviewServer(server) {
            const dist = resolve(server.config.root, server.config.build.outDir);
            server.middlewares.use(async (request, response, next) => {
                if (!["GET", "HEAD"].includes(request.method)) return next();
                let url;
                try {
                    url = new URL(request.url, "http://localhost");
                } catch {
                    response.statusCode = 400;
                    response.end();
                    return;
                }
                const meta = getRouteMeta(url.pathname);
                if (meta.canonical) {
                    request.url = `/${routeHtmlFile(meta.path)}${url.search}`;
                    return next();
                }
                // Match production: static assets precede a real 404 page.
                const file = resolve(dist, `.${url.pathname}`);
                try {
                    if (file.startsWith(dist + sep)) {
                        await access(file);
                        return next();
                    }
                } catch { /* Missing static file: use the generated 404. */ }
                try {
                    const html = await readFile(resolve(dist, "404.html"), "utf8");
                    response.statusCode = 404;
                    response.setHeader("Content-Type", "text/html; charset=utf-8");
                    response.end(request.method === "HEAD" ? undefined : html);
                } catch (error) { next(error); }
            });
        },
    };
}

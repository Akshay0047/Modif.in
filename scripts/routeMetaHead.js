import { getIndexableRoutes } from "../src/data/routeMeta.js";

const NOT_FOUND_TITLE = "Page not found | Modif";
const NOT_FOUND_DESCRIPTION = "This address is not a Modif page. Browse the text, image, and document tools from the homepage.";

export function buildRouteMetaBootScript() {
    const routes = Object.fromEntries(
        getIndexableRoutes().map((route) => [
            route.path,
            { t: route.title, d: route.description, c: route.canonical },
        ]),
    );
    const payload = JSON.stringify(routes).replace(/</g, "\\u003c");

    return `<script>
      (function () {
        var routes = ${payload};
        var path = location.pathname || "/";
        try { path = decodeURI(path); } catch (e) {}
        path = path.replace(/\\/+$/, "").toLowerCase() || "/";
        if (path.charAt(0) !== "/") path = "/" + path;
        var route = routes[path];
        var title = route ? route.t : ${JSON.stringify(NOT_FOUND_TITLE)};
        var description = route ? route.d : ${JSON.stringify(NOT_FOUND_DESCRIPTION)};
        var canonical = route ? route.c : "";
        document.title = title;
        function meta(attr, key, content) {
          var selector = "meta[" + attr + "=\\"" + key + "\\"]";
          var element = document.head.querySelector(selector);
          if (!content) { if (element) element.remove(); return; }
          if (!element) {
            element = document.createElement("meta");
            element.setAttribute(attr, key);
            document.head.appendChild(element);
          }
          element.setAttribute("content", content);
        }
        meta("name", "description", description);
        meta("property", "og:type", "website");
        meta("property", "og:title", title);
        meta("property", "og:description", description);
        meta("property", "og:url", canonical);
        meta("name", "twitter:card", "summary");
        meta("name", "twitter:title", title);
        meta("name", "twitter:description", description);
        meta("name", "robots", canonical ? "index,follow" : "noindex");
        var links = document.head.querySelectorAll('link[rel="canonical"]');
        for (var i = links.length - 1; i >= 0; i -= 1) links[i].remove();
        if (!canonical) return;
        var link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        link.setAttribute("href", canonical);
        document.head.appendChild(link);
      })();
    </script>`;
}

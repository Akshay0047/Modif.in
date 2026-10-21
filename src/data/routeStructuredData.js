import { textToolsData } from "./textTools.js";
import { imageToolsData } from "./imageTools.js";
import { docToolsData } from "./docTools.js";

const hubs = {
    "/text": "Text Tools",
    "/image": "Image Tools",
    "/doc": "Document Tools",
};
const tools = new Map(
    [...textToolsData, ...imageToolsData, ...docToolsData]
        .flatMap((category) => category.tools)
        .map((tool) => [tool.path, tool]),
);

export function getRouteStructuredData(meta) {
    if (!meta?.canonical) return null;
    const tool = tools.get(meta.path);
    const hubPath = tool ? `/${meta.path.split("/")[1]}` : meta.path;
    if (meta.path !== "/" && !hubs[hubPath]) return null;
    if (meta.path !== hubPath && !tool) return null;

    const homeUrl = new URL("/", meta.canonical).href;
    const websiteId = `${homeUrl}#website`;
    if (meta.path === "/") {
        return {
            "@context": "https://schema.org",
            "@graph": [{
                "@type": "WebSite",
                "@id": websiteId,
                url: homeUrl,
                name: "MODIF.in",
                description: meta.description,
                inLanguage: "en",
                isAccessibleForFree: true,
            }],
        };
    }

    const hubUrl = new URL(hubPath, homeUrl).href;
    const pageId = `${meta.canonical}#webpage`;
    const breadcrumbId = `${meta.canonical}#breadcrumbs`;
    const applicationId = `${meta.canonical}#application`;
    const crumbs = [
        { name: "MODIF.in", item: homeUrl },
        { name: hubs[hubPath], item: hubUrl },
        ...(tool ? [{ name: tool.name, item: meta.canonical }] : []),
    ];
    const graph = [{
        "@type": tool ? "WebPage" : "CollectionPage",
        "@id": pageId,
        url: meta.canonical,
        name: meta.title,
        description: meta.description,
        inLanguage: "en",
        isAccessibleForFree: true,
        isPartOf: { "@id": websiteId },
        breadcrumb: { "@id": breadcrumbId },
        ...(tool ? { mainEntity: { "@id": applicationId } } : {}),
    }, {
        "@type": "BreadcrumbList",
        "@id": breadcrumbId,
        itemListElement: crumbs.map((crumb, index) => ({
            "@type": "ListItem",
            position: index + 1,
            ...crumb,
        })),
    }];

    if (tool) {
        graph.push({
            "@type": "WebApplication",
            "@id": applicationId,
            url: meta.canonical,
            name: tool.name,
            description: meta.description,
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Any",
            browserRequirements: "Requires JavaScript and a modern web browser.",
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            mainEntityOfPage: { "@id": pageId },
        });
    }

    return { "@context": "https://schema.org", "@graph": graph };
}

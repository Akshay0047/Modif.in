/** GA4 Measurement ID — must match the id in index.html gtag config. */
export const GA_MEASUREMENT_ID = "G-SFVEF88V33";

let lastTrackedPath = "";

/**
 * Sends a single page_view for the current URL. Dedupes identical paths so
 * React StrictMode remounts do not double-count in development.
 * Only runs in production builds (no events from local dev).
 */
export function trackGaPageView() {
    if (!import.meta.env.PROD) return;
    if (typeof window.gtag !== "function") return;
    loadAnalyticsAfterContent(GA_MEASUREMENT_ID);

    const page_path = `${window.location.pathname}${window.location.search}`;
    if (lastTrackedPath === page_path) return;
    lastTrackedPath = page_path;

    window.gtag("event", "page_view", {
        page_path,
        page_location: `${window.location.origin}${page_path}`,
        page_title: document.title,
    });
}
import { loadAnalyticsAfterContent } from "./loadAnalytics.js";


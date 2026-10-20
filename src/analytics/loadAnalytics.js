let scheduled = false;

/** Queue the SDK only after real route content has painted; page views already
 * wait in gtag's existing dataLayer queue while the optional script loads. */
export function loadAnalyticsAfterContent(measurementId) {
    if (scheduled) return;
    scheduled = true;

    const load = () => {
        const script = document.createElement("script");
        script.async = true;
        script.fetchPriority = "low";
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
        document.head.appendChild(script);
    };
    const afterPaint = () => {
        requestAnimationFrame(() => requestAnimationFrame(() => {
            if (typeof window.requestIdleCallback === "function") {
                window.requestIdleCallback(load, { timeout: 3000 });
            } else {
                window.setTimeout(load, 1000);
            }
        }));
    };

    const isReady = () => document.querySelector("#main-content h1")
        && !document.querySelector('.route-feedback[role="status"]');
    if (isReady()) {
        afterPaint();
        return;
    }

    const observer = new MutationObserver(() => {
        if (!isReady()) return;
        observer.disconnect();
        afterPaint();
    });
    observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

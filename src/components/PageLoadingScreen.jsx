import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAnimationSettings } from "../contexts/AnimationContext";
import { getModuleFromPathname } from "../utils/moduleTheme";
import { acquireInert } from "../utils/inertLock";

export default function PageLoadingScreen() {
    const { pathname } = useLocation();
    const { active, reducedMotion } = useAnimationSettings();

    useEffect(() => {
        const loader = document.getElementById("page-loader");
        if (loader) loader.dataset.motion = active && !reducedMotion ? "pulse" : "still";
    }, [active, reducedMotion]);

    useLayoutEffect(() => {
        const loader = document.getElementById("page-loader");
        const root = document.getElementById("root");
        const content = document.getElementById("page-content");
        if (!loader || !root || !content) return undefined;
        window.clearTimeout(window.__modifBootTimer);
        const html = document.documentElement;
        const events = new AbortController();
        const previousBusy = content.getAttribute("aria-busy");
        const releaseInert = [content, root.querySelector(".skip-link")]
            .filter(Boolean).map((element) => acquireInert(element));
        if (root.hasAttribute("data-loader-boot")) {
            // Adopt the initial HTML lock, then let the mounted header work
            // while the page content keeps its own independent loading lock.
            const releaseBoot = acquireInert(root, { initiallyInert: false });
            root.removeAttribute("data-loader-boot");
            root.removeAttribute("aria-busy");
            releaseBoot();
        }
        const decoded = new Map();
        const decoding = new Map();
        let disposed = false, revealing = false;
        let ownsLoadingLock = true;
        let firstFrame = 0, secondFrame = 0, exitTimer = 0;

        loader.dataset.state = "loading";
        loader.setAttribute("role", "status");
        loader.setAttribute("aria-label", "Loading page");
        const bootRecovery = document.getElementById("boot-recovery");
        if (bootRecovery) bootRecovery.hidden = true;
        content.setAttribute("aria-busy", "true");
        html.classList.add("modif-page-loading");

        const release = () => {
            if (!ownsLoadingLock) return;
            ownsLoadingLock = false;
            releaseInert.forEach((release) => release());
            if (previousBusy === null) content.removeAttribute("aria-busy");
            else content.setAttribute("aria-busy", previousBusy);
            html.classList.remove("modif-page-loading");
        };
        const finish = () => {
            if (disposed) return;
            loader.dataset.state = "hidden";
            release();
        };
        const reveal = () => {
            if (disposed || revealing) return;
            revealing = true;
            observer.disconnect();
            events.abort();
            window.clearTimeout(deadline);
            // Let committed layout, shader draws and image decoding reach the
            // compositor before the opaque cover begins to fade.
            firstFrame = requestAnimationFrame(() => {
                secondFrame = requestAnimationFrame(() => {
                    if (disposed) return;
                    loader.dataset.state = "revealing";
                    const duration = parseFloat(getComputedStyle(loader).transitionDuration) * 1000;
                    exitTimer = window.setTimeout(finish, Number.isFinite(duration) ? duration : 0);
                });
            });
        };
        const inspect = () => {
            if (disposed || revealing) return;
            const recovery = root.querySelector('.route-feedback[role="alert"], .not-found-page');
            if (recovery?.getClientRects().length) {
                reveal();
                return;
            }
            if (html.dataset.pageReady !== pathname || root.querySelector('.route-feedback[role="status"]')) return;
            if (document.fonts?.status === "loading") return;

            const sceneKind = pathname === "/" ? "home" : "module";
            const scene = pathname === "/" ? ".dither-container canvas" :
                getModuleFromPathname(pathname) ? ".app-silk-backdrop canvas" : null;
            if (scene && html.dataset[`${sceneKind}SceneFailed`] !== "true" && root.querySelector(scene)?.dataset.sceneReady !== "true") return;

            let imagesReady = true;
            for (const image of root.querySelectorAll("img")) {
                const rect = image.getBoundingClientRect();
                if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight) continue;
                const source = image.currentSrc || image.src;
                if (!image.complete) {
                    imagesReady = false;
                    if (decoding.get(image) !== source) {
                        decoding.set(image, source);
                        image.addEventListener("load", inspect, { once: true, signal: events.signal });
                        image.addEventListener("error", inspect, { once: true, signal: events.signal });
                    }
                } else if (image.naturalWidth && image.decode && decoded.get(image) !== source) {
                    imagesReady = false;
                    if (decoding.get(image) === `decode:${source}`) continue;
                    decoding.set(image, `decode:${source}`);
                    image.decode().catch(() => {}).then(() => {
                        if (disposed) return;
                        decoded.set(image, source);
                        inspect();
                    });
                }
            }
            if (imagesReady) reveal();
        };
        const observer = new MutationObserver(inspect);
        observer.observe(html, { childList: true, subtree: true, attributes: true,
            attributeFilter: ["data-page-ready", "data-scene-ready", "data-home-scene-failed", "data-module-scene-failed", "src", "srcset"] });
        const deadline = window.setTimeout(reveal, 15000);
        document.fonts?.ready.then(inspect);
        document.fonts?.addEventListener("loadingdone", inspect, { signal: events.signal });
        document.addEventListener("visibilitychange", inspect, { signal: events.signal });
        inspect();

        return () => {
            disposed = true;
            observer.disconnect();
            events.abort();
            window.clearTimeout(deadline);
            window.clearTimeout(exitTimer);
            cancelAnimationFrame(firstFrame);
            cancelAnimationFrame(secondFrame);
            loader.dataset.state = "hidden";
            release();
        };
    }, [pathname]);

    return null;
}

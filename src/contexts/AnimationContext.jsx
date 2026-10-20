import { createContext, useContext, useState, useSyncExternalStore } from "react";

const AnimationContext = createContext({ enabled: false, reducedMotion: false, toggle: () => {} });
const STORAGE_KEY = "modif-animation";
const reducedQuery = "(prefers-reduced-motion: reduce)";

function subscribe(listener) {
    const media = [window.matchMedia(reducedQuery)];
    media.forEach((query) => query.addEventListener("change", listener));
    document.addEventListener("visibilitychange", listener);
    return () => {
        media.forEach((query) => query.removeEventListener("change", listener));
        document.removeEventListener("visibilitychange", listener);
    };
}

function getSnapshot() {
    return `${window.matchMedia(reducedQuery).matches},${document.hidden}`;
}

export function AnimationProvider({ children }) {
    const [preference, setPreference] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored === null ? null : stored === "on";
        } catch { return null; }
    });
    const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => "true,false");
    const [reduce, hidden] = snapshot.split(",").map((value) => value === "true");
    const enabled = !reduce && (preference ?? true);
    const toggle = () => {
        const next = !enabled;
        setPreference(next);
        try { localStorage.setItem(STORAGE_KEY, next ? "on" : "off"); } catch { /* Device storage may be unavailable. */ }
    };
    return <AnimationContext.Provider value={{ enabled, active: enabled && !hidden, reducedMotion: reduce, toggle }}>{children}</AnimationContext.Provider>;
}

// Shared by all decorative effects so the header control pauses the whole page.
// eslint-disable-next-line react-refresh/only-export-components
export function useAnimationSettings() { return useContext(AnimationContext); }

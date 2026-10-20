import { useSyncExternalStore } from "react";

const query = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const subscribe = (listener) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
};
const getSnapshot = () => window.matchMedia(query).matches;

export default function useCursorSupport() {
    return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

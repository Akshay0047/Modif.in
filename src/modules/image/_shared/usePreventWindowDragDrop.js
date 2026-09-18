import { useEffect } from "react";

/** Blocks the browser from opening dropped files outside tool dropzones. */
export function usePreventWindowDragDrop(enabled = true) {
    useEffect(() => {
        if (!enabled) return undefined;

        const prevent = (event) => {
            event.preventDefault();
            event.stopPropagation();
        };

        window.addEventListener("dragover", prevent);
        window.addEventListener("drop", prevent);

        return () => {
            window.removeEventListener("dragover", prevent);
            window.removeEventListener("drop", prevent);
        };
    }, [enabled]);
}

export default usePreventWindowDragDrop;

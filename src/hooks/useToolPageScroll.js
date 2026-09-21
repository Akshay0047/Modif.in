import { useEffect } from "react";

export function useToolPageScroll() {
    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const root = document.getElementById("root");

        const previous = {
            htmlOverflow: html.style.overflow,
            htmlOverflowX: html.style.overflowX,
            htmlOverflowY: html.style.overflowY,
            htmlHeight: html.style.height,
            bodyOverflow: body.style.overflow,
            bodyOverflowX: body.style.overflowX,
            bodyOverflowY: body.style.overflowY,
            bodyHeight: body.style.height,
            rootOverflow: root?.style.overflow ?? "",
            rootOverflowX: root?.style.overflowX ?? "",
            rootOverflowY: root?.style.overflowY ?? "",
            rootHeight: root?.style.height ?? "",
        };

        html.style.overflowX = "clip";
        html.style.overflowY = "auto";
        html.style.height = "auto";
        body.style.overflowX = "clip";
        body.style.overflowY = "auto";
        body.style.height = "auto";

        if (root) {
            root.style.overflowX = "clip";
            root.style.overflowY = "auto";
            root.style.height = "auto";
            root.style.minHeight = "100%";
        }

        return () => {
            html.style.overflow = previous.htmlOverflow;
            html.style.overflowX = previous.htmlOverflowX;
            html.style.overflowY = previous.htmlOverflowY;
            html.style.height = previous.htmlHeight;
            body.style.overflow = previous.bodyOverflow;
            body.style.overflowX = previous.bodyOverflowX;
            body.style.overflowY = previous.bodyOverflowY;
            body.style.height = previous.bodyHeight;

            if (root) {
                root.style.overflow = previous.rootOverflow;
                root.style.overflowX = previous.rootOverflowX;
                root.style.overflowY = previous.rootOverflowY;
                root.style.height = previous.rootHeight;
                root.style.minHeight = "";
            }
        };
    }, []);
}

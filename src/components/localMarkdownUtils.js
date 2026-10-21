import { defaultUrlTransform } from "react-markdown";

export function isLocalImageSource(url) {
    return /^(?:data:image\/(?:png|jpeg|gif|webp|bmp|avif);base64,|blob:)/i.test(url || "");
}

// Pasted image URLs, including relative paths, must never become requests.
// Links keep react-markdown's default protocol checks and require a click.
export function localMarkdownUrlTransform(url, key) {
    return key === "src" ? isLocalImageSource(url) ? url : "" : defaultUrlTransform(url);
}

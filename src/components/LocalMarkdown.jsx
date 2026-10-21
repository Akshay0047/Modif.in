import ReactMarkdown from "react-markdown";
import { isLocalImageSource, localMarkdownUrlTransform } from "./localMarkdownUtils";

function LocalImage({ src, alt, title }) {
    if (!isLocalImageSource(src)) {
        return <span>External image blocked for privacy{alt ? `: ${alt}` : "."}</span>;
    }
    return <img src={src} alt={alt || ""} title={title} />;
}

const COMPONENTS = { h1: "h2", h2: "h3", h3: "h4", h4: "h5", h5: "h6", h6: "h6", img: LocalImage };

export default function LocalMarkdown({ children }) {
    return <ReactMarkdown components={COMPONENTS} urlTransform={localMarkdownUrlTransform}>{children}</ReactMarkdown>;
}

import { createTool } from "./createTool.js";

const PREFIX = "image";

// Curated common tasks; see docs/popular-tools.md for selection criteria.
export const imagePopularToolOrder = [
    "compress-image",
    "crop-resize",
    "convert-to-jpg-png",
    "compress-to-target-size",
    "heic-to-jpg",
    "webp-converter",
    "image-to-pdf",
    "rotate-flip",
];

const popularToolIds = new Set(imagePopularToolOrder);
const tool = (id, name, category) =>
    createTool(PREFIX, id, name, category, popularToolIds.has(id));

export const imageToolsData = [
    {
        id: "compress-optimize",
        name: "Compress & Optimize",
        tools: [
            tool("compress-image", "Compress Image", "Compress & Optimize"),
            tool(
                "compress-to-target-size",
                "Compress to Target Size",
                "Compress & Optimize",
            ),
            tool(
                "bulk-image-processor",
                "Bulk Image Processor",
                "Compress & Optimize",
            ),
        ],
    },
    {
        id: "image-converters",
        name: "Image Converters",
        tools: [
            tool(
                "convert-to-jpg-png",
                "Convert to JPG / PNG",
                "Image Converters",
            ),
            tool("heic-to-jpg", "HEIC to JPG", "Image Converters"),
            tool("image-to-pdf", "Image to PDF", "Image Converters"),
            tool("webp-converter", "WEBP Converter", "Image Converters"),
            tool("svg-to-png-jpg", "SVG to PNG / JPG", "Image Converters"),
            tool(
                "gif-frame-extractor-converter",
                "GIF Frame Extractor & Converter",
                "Image Converters",
            ),
        ],
    },
    {
        id: "edit-adjust",
        name: "Edit & Adjust",
        tools: [
            tool("crop-resize", "Crop & Resize", "Edit & Adjust"),
            tool("rotate-flip", "Rotate & Flip", "Edit & Adjust"),
            tool("color-adjustments", "Color Adjustments", "Edit & Adjust"),
            tool("filters-effects", "Filters & Effects", "Edit & Adjust"),
            tool("blur-censor", "Blur & Censor", "Edit & Adjust"),
            tool("profile-picture-maker", "Profile Picture Maker", "Edit & Adjust"),
        ],
    },
    {
        id: "create-generate",
        name: "Create & Generate",
        tools: [
            tool("watermark-image", "Watermark Image", "Create & Generate"),
            tool("meme-generator", "Meme Generator", "Create & Generate"),
            tool("image-splitter", "Image Splitter", "Create & Generate"),
            tool("image-stitcher", "Image Stitcher", "Create & Generate"),
            tool(
                "device-mockup-generator",
                "Device Mockup Generator",
                "Create & Generate",
            ),
        ],
    },
    {
        id: "developer-tech-tools",
        name: "Developer & Tech Tools",
        tools: [
            tool(
                "favicon-generator",
                "Favicon Generator",
                "Developer & Tech Tools",
            ),
            tool(
                "exif-data-viewer-stripper",
                "EXIF Data Viewer & Stripper",
                "Developer & Tech Tools",
            ),
            tool(
                "base64-encoder-decoder",
                "Base64 Encoder / Decoder",
                "Developer & Tech Tools",
            ),
            tool(
                "color-palette-extractor",
                "Color Palette Extractor",
                "Developer & Tech Tools",
            ),
            tool(
                "placeholder-image-generator",
                "Placeholder Image Generator",
                "Developer & Tech Tools",
            ),
        ],
    },
];

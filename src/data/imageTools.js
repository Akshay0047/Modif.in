import { createTool } from "./createTool.js";

const PREFIX = "image";
const tool = (id, name, category, isPopular = false) =>
    createTool(PREFIX, id, name, category, isPopular);

export const imagePopularToolOrder = [
    "compress-image",
    "convert-to-jpg-png",
    "crop-resize",
    "heic-to-jpg",
    "image-to-pdf",
    "compress-to-target-size",
    "webp-converter",
    "rotate-flip",
    "watermark-image",
    "meme-generator",
    "favicon-generator",
    "exif-data-viewer-stripper",
];

export const imageToolsData = [
    {
        id: "compress-optimize",
        name: "Compress & Optimize",
        tools: [
            tool("compress-image", "Compress Image", "Compress & Optimize", true),
            tool(
                "compress-to-target-size",
                "Compress to Target Size",
                "Compress & Optimize",
                true,
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
                true,
            ),
            tool("heic-to-jpg", "HEIC to JPG", "Image Converters", true),
            tool("image-to-pdf", "Image to PDF", "Image Converters", true),
            tool("webp-converter", "WEBP Converter", "Image Converters", true),
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
            tool("crop-resize", "Crop & Resize", "Edit & Adjust", true),
            tool("rotate-flip", "Rotate & Flip", "Edit & Adjust", true),
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
            tool("watermark-image", "Watermark Image", "Create & Generate", true),
            tool("meme-generator", "Meme Generator", "Create & Generate", true),
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
                true,
            ),
            tool(
                "exif-data-viewer-stripper",
                "EXIF Data Viewer & Stripper",
                "Developer & Tech Tools",
                true,
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

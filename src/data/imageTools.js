const PREFIX = "image";

function tool(id, name, category, isPopular = false) {
    return {
        id,
        name,
        category,
        isPopular,
        path: `/${PREFIX}/${id}`,
    };
}

export const imageToolsData = [
    {
        id: "format-conversion",
        name: "Format Conversion",
        tools: [
            tool("raster-converter", "Raster Converter", "Format Conversion"),
            tool("vector-raster", "Vector ↔ Raster", "Format Conversion"),
            tool("heic-raw-tools", "HEIC / RAW Tools", "Format Conversion"),
            tool("animation-converter", "Animation Converter", "Format Conversion"),
        ],
    },
    {
        id: "resizing-layout",
        name: "Resizing & Layout",
        tools: [
            tool("image-resizer", "Image Resizer", "Resizing & Layout", true),
            tool("crop-tool", "Crop Tool", "Resizing & Layout"),
            tool(
                "id-passport-photo-maker",
                "ID / Passport Photo Maker",
                "Resizing & Layout",
            ),
            tool("image-splitter", "Image Splitter", "Resizing & Layout"),
            tool("image-combiner", "Image Combiner (Stitcher)", "Resizing & Layout"),
            tool("collage-maker", "Collage Maker", "Resizing & Layout"),
            tool("ai-image-upscaler", "AI Image Upscaler", "Resizing & Layout"),
            tool("border-padding", "Border & Padding", "Resizing & Layout"),
        ],
    },
    {
        id: "optimization-compression",
        name: "Optimization & Compression",
        tools: [
            tool(
                "smart-compressor",
                "Smart Compressor",
                "Optimization & Compression",
                true,
            ),
            tool(
                "target-size-compressor",
                "Target Size Compressor",
                "Optimization & Compression",
            ),
            tool("batch-processor", "Batch Processor", "Optimization & Compression"),
        ],
    },
    {
        id: "adjustments-editing",
        name: "Adjustments & Editing",
        tools: [
            tool("color-adjustments", "Color Adjustments", "Adjustments & Editing"),
            tool("filters-effects", "Filters & Effects", "Adjustments & Editing"),
            tool("transform", "Transform", "Adjustments & Editing"),
            tool(
                "background-tools",
                "Background Tools",
                "Adjustments & Editing",
                true,
            ),
            tool(
                "meme-caption-generator",
                "Meme & Caption Generator",
                "Adjustments & Editing",
            ),
            tool(
                "screenshot-enhancer",
                "Screenshot Enhancer",
                "Adjustments & Editing",
            ),
        ],
    },
    {
        id: "metadata-watermarking",
        name: "Metadata & Watermarking",
        tools: [
            tool("exif-metadata-tools", "EXIF Metadata Tools", "Metadata & Watermarking"),
            tool("watermark-generator", "Watermark Generator", "Metadata & Watermarking"),
        ],
    },
    {
        id: "developer-web-tools",
        name: "Developer & Web Tools",
        tools: [
            tool("html-webpage-to-image", "HTML/Webpage to Image", "Developer & Web Tools"),
            tool("base64-tools", "Base64 Tools", "Developer & Web Tools"),
            tool("color-extraction", "Color Extraction", "Developer & Web Tools"),
            tool("favicon-generator", "Favicon Generator", "Developer & Web Tools"),
            tool("dummy-image-generator", "Dummy Image Generator", "Developer & Web Tools"),
        ],
    },
];

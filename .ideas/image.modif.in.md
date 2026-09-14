# Image.modif.in
---
 
# 1. Format Conversion
Tools for changing image file types and converting between raster and vector formats.
 
1. **Raster Converter**
    * PNG ↔ JPG
    * WEBP ↔ PNG/JPG
    * AVIF ↔ PNG/JPG
    * TIFF, BMP, and GIF support
2. **Vector ↔ Raster**
    * Image to SVG (Tracing / Vectorization)
    * SVG to PNG/JPG
    * SVG Optimizer (Minify code)
3. **HEIC / RAW Tools**
    * HEIC to JPG/PNG (Apple format conversion)
    * RAW to JPG/PNG (CR2, NEF, ARW)
4. **Animation Converter**
    * GIF ↔ MP4
    * GIF ↔ APNG/WEBP
    * Extract frames from GIF
---
 
# 2. Resizing & Layout
Tools for changing the physical dimensions, aspect ratio, and composition of images.
 
1. **Image Resizer**
    * By exact pixels
    * By percentage
    * Maintain aspect ratio / force stretch
2. **Crop Tool**
    * Freeform crop
    * Aspect ratio presets (16:9, 4:3, 1:1, Social Media sizes)
    * Shape crop (Circle, rounded rectangle, polygon)
3. **ID / Passport Photo Maker**
    * Country-specific size presets (passport, visa, ID card)
    * Auto background replacement to plain white/color
4. **Image Splitter**
    * Grid slice (e.g., 3x3 for Instagram grids)
    * Horizontal/Vertical slice
5. **Image Combiner (Stitcher)**
    * Merge vertically (Long screenshots)
    * Merge horizontally
    * Create sprite sheets
6. **Collage Maker**
    * Preset multi-photo layouts and grids
    * Adjustable spacing, borders, and background color
7. **AI Image Upscaler**
    * Increase resolution (2x, 4x) while preserving detail
    * Photo vs. illustration/anime-optimized modes
8. **Border & Padding**
    * Add solid color padding
    * Add blurred background padding
    * Round image corners
---
 
# 3. Optimization & Compression
Utilities to reduce file size for web performance and storage constraints.
 
1. **Smart Compressor**
    * Lossy compression (Adjustable quality slider)
    * Lossless optimization
2. **Target Size Compressor**
    * Compress to exact KB/MB target (e.g., "Compress to exactly 200KB")
3. **Batch Processor**
    * Chain resize + compress + convert + rename in one bulk action
    * Apply the same preset across an entire folder of images
---
 
# 4. Adjustments & Editing
Tools for altering the visual appearance and color profile of an image.
 
1. **Color Adjustments**
    * Brightness & Contrast
    * Hue & Saturation
    * Exposure & Gamma
    * Temperature (Warm/Cool)
2. **Filters & Effects**
    * Grayscale
    * Sepia & Duotone
    * Pixelate / Censor
    * Blur (Gaussian, motion)
    * Sharpen
    * Invert colors
3. **Transform**
    * Rotate (90°, 180°, custom angle)
    * Flip (Horizontal / Vertical)
4. **Background Tools**
    * AI Background Removal
    * Replace background (Solid color, transparent, or image)
    * Blur background
5. **Meme & Caption Generator**
    * Top/bottom caption text with classic meme fonts
    * Sticker, frame, and emoji overlays
6. **Screenshot Enhancer**
    * Add device frames, drop shadows, and background padding to screenshots
    * Quick browser-chrome / mobile-frame mockup wrap
---
 
# 5. Metadata & Watermarking
Tools for handling image privacy, copyright, and embedded data.
 
1. **EXIF Metadata Tools**
    * View EXIF data (Camera model, GPS location, aperture)
    * Strip/Remove metadata (Privacy cleaner)
    * Edit EXIF tags
2. **Watermark Generator**
    * Add text watermark (Custom font, opacity, rotation)
    * Add image watermark (Logo overlay)
    * Tiled/Repeated watermark pattern
---
 
# 6. Developer & Web Tools
Dedicated utilities matching the technical utility focus of the site.
 
1. **HTML/Webpage to Image**
    * Convert a URL or raw HTML snippet into a JPG/PNG screenshot
2. **Base64 Tools**
    * Image to Base64 String
    * Base64 String to Image Preview & Download
3. **Color Extraction**
    * Eyedropper / Color Picker (Click pixel to get HEX/RGB)
    * Generate Color Palette (Extract dominant colors from image)
4. **Favicon Generator**
    * Generate `favicon.ico`
    * Output multiple web app icon sizes (Apple Touch, Android Chrome)
5. **Dummy Image Generator**
    * Generate placeholder images via URL parameters
    * Custom dimensions, background colors, and placeholder text
---
 
# Final Site Structure
 
```text
IMAGE TOOLBOX
│
├── Format Conversion
│   ├── Raster Converter
│   ├── Vector ↔ Raster
│   ├── HEIC / RAW Tools
│   └── Animation Converter
│
├── Resizing & Layout
│   ├── Image Resizer
│   ├── Crop Tool
│   ├── ID / Passport Photo Maker
│   ├── Image Splitter
│   ├── Image Combiner
│   ├── Collage Maker
│   ├── AI Image Upscaler
│   └── Border & Padding
│
├── Optimization & Compression
│   ├── Smart Compressor
│   ├── Target Size Compressor
│   └── Batch Processor
│
├── Adjustments & Editing
│   ├── Color Adjustments
│   ├── Filters & Effects
│   ├── Transform
│   ├── Background Tools
│   ├── Meme & Caption Generator
│   └── Screenshot Enhancer
│
├── Metadata & Watermarking
│   ├── EXIF Metadata Tools
│   └── Watermark Generator
│
└── Developer & Web Tools
    ├── HTML/Webpage to Image
    ├── Base64 Tools
    ├── Color Extraction
    ├── Favicon Generator
    └── Dummy Image Generator
```
 
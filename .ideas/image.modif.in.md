# Image.modif.in

---

# 1. Image Converters
Tools for switching file formats, creating multi-page documents, and extracting frames.

### Convert to JPG / PNG
* **Description:** Lossless and lossy raster format swapping with alpha-channel handling.
* **UI Controls:**
  * File dropzone with thumbnail preview.
  * Target format segmented control: `JPG` | `PNG`.
  * Quality slider (1% to 100%, active only when JPG is selected).
  * Transparency replacement color picker (default: `#FFFFFF`, replaces alpha when converting to JPG).
  * Buttons: `Convert & Download`, `Copy to Clipboard`.
* **Implementation:** HTML5 Canvas `canvas.toBlob('image/jpeg', quality)`.

### WEBP Converter
* **Description:** Convert legacy formats to modern WebP for bandwidth savings, or decode WebP to standard PNG/JPG.
* **UI Controls:**
  * Mode toggle: `To WebP` | `From WebP`.
  * Compression type radio: `Lossy` vs. `Lossless`.
  * Quality slider (1% to 100%).
  * Target format dropdown (when converting from WebP): `PNG`, `JPG`.
  * Button: `Convert & Download`.
* **Implementation:** Native browser canvas WebP encoding support.

### HEIC to JPG
* **Description:** Convert Apple iPhone HEIC/HEIF photos into web-compatible JPG or PNG files directly in-browser.
* **UI Controls:**
  * Multi-file dropzone (accepts `.heic`, `.heif`).
  * Output format selector: `JPG` | `PNG`.
  * Output quality slider (50% to 100%).
  * Batch list showing original file name, size, and conversion progress bar.
  * Button: `Download All as ZIP` (powered by `JSZip`).
* **Implementation:** Client-side WebAssembly parser via `heic2any`.

### SVG to PNG / JPG
* **Description:** Render vector graphics into high-resolution pixel images with custom scaling.
* **UI Controls:**
  * SVG code paste textarea or `.svg` file dropzone.
  * Resolution multiplier buttons: `1x`, `2x`, `4x`, `8x`, and custom width/height inputs.
  * Background toggle: `Transparent` vs. `Solid Color Picker`.
  * Output format dropdown: `PNG` | `JPG` | `WEBP`.
  * Button: `Export Raster Image`.
* **Implementation:** Parse SVG into an `Image()` object drawn onto an oversized `<canvas>`.

### Image to PDF
* **Description:** Combine one or multiple images into a clean, printable PDF document.
* **UI Controls:**
  * Multi-image upload area with drag-to-reorder thumbnail grid.
  * Page orientation radio: `Portrait` | `Landscape` | `Auto-detect`.
  * Page size dropdown: `Fit to Image`, `A4`, `US Letter`.
  * Page margin segmented control: `None (0mm)`, `Small (10mm)`, `Large (20mm)`.
  * Button: `Generate & Download PDF`.
* **Implementation:** Pure client-side PDF compilation via `pdf-lib`.

### GIF Frame Extractor & Converter
* **Description:** Deconstruct animated GIFs into individual frames or export animation cycles.
* **UI Controls:**
  * GIF upload dropzone.
  * Frame player with play/pause, step forward, and step backward buttons.
  * Frame scrubber slider (`Frame X of Total`).
  * "Extract All Frames" output format selector: `PNG ZIP` | `JPG ZIP`.
  * Button: `Download Selected Frame`, `Download All Frames (.zip)`.
* **Implementation:** Canvas frame scraping using `gifuct-js` or `omggif`.

---

# 2. Edit & Adjust
Canvas-based compositional, spatial, and color transformations.

### Crop & Resize
* **Description:** Dimensional scaling and boundary cropping packed into a single fluid canvas tool.
* **UI Controls:**
  * Interactive canvas with draggable corner cropping handles.
  * Aspect ratio preset buttons: `Freeform`, `1:1 (Square)`, `16:9`, `4:5 (Insta)`, `9:16 (Story)`.
  * Dimension number inputs: `Width (px)` and `Height (px)`.
  * "Lock Aspect Ratio" link toggle button.
  * Scaling method dropdown: `Bicubic (Smooth)` | `Nearest Neighbor (Pixel Art)`.
  * Buttons: `Apply Crop`, `Reset`, `Download`.
* **Implementation:** Canvas 2D context clipping and scaling transforms.

### Rotate & Flip
* **Description:** Correct orientation and flip mirrors across both axes.
* **UI Controls:**
  * Quick action buttons: `Rotate 90° CW`, `Rotate 90° CCW`, `Rotate 180°`.
  * Flip toggles: `Flip Horizontal`, `Flip Vertical`.
  * Fine-angle rotation slider (-45° to +45° with 0.1° step).
  * Auto-crop bounding box toggle (prevents black background wedges after free rotation).
  * Button: `Export Image`.
* **Implementation:** `ctx.translate()` and `ctx.rotate()` canvas transforms.

### Color Adjustments
* **Description:** Real-time color correction and exposure grading.
* **UI Controls:**
  * Sliders with zero-center reset buttons (-100 to +100):
    * Brightness
    * Contrast
    * Saturation
    * Exposure
    * Temperature (Warm / Cool)
  * View toggle: `Side-by-Side Split View` vs. `Hold to Compare Original`.
  * Button: `Reset All Sliders`, `Save Image`.
* **Implementation:** CSS filter string compilation applied directly to `ctx.filter` or WebGL fragment shaders for instant rendering.

### Filters & Effects
* **Description:** Instant 1-click aesthetic filters and creative treatments.
* **UI Controls:**
  * Preset card carousel: `Grayscale`, `Sepia`, `Vintage`, `Invert`, `Duotone`, `Technicolor`, `Cold Blue`.
  * Filter intensity slider (0% to 100%).
  * Duotone primary and secondary color pickers (active only when Duotone is clicked).
  * Button: `Export Filtered Photo`.
* **Implementation:** Canvas pixel pipeline looping over `ImageData.data` RGBA arrays.

### Blur & Censor
* **Description:** Conceal faces, license plates, credentials, and sensitive areas.
* **UI Controls:**
  * Censor style selector: `Pixelate` | `Gaussian Blur` | `Black Bar`.
  * Brush/Box tool toggle: `Rectangle Draw` vs. `Freehand Brush`.
  * Blur strength / Pixel block-size slider (2px to 50px).
  * History buttons: `Undo`, `Redo`, `Clear All Masks`.
  * Button: `Download Censored Image`.
* **Implementation:** Localized `ctx.getImageData()` downsampling and redraw loop.

### Profile Picture Maker
* **Description:** Transform raw headshots into ready-to-use circular avatars with colored borders.
* **UI Controls:**
  * Circular viewport mask with zoom slider (1x to 3x) and drag-to-reposition.
  * Border thickness slider (0px to 20px).
  * Border color picker.
  * Background style tabs: `Transparent`, `Solid Color`, `Preset Gradients`.
  * Button: `Export Avatar (PNG)`.
* **Implementation:** Elliptical canvas clipping paths (`ctx.arc`, `ctx.clip`).

---

# 3. Compress & Optimize
File size minimization utilities running completely in the client's memory.

### Compress Image
* **Description:** Perceptually optimized compression balancing visual fidelity and storage.
* **UI Controls:**
  * Quality slider (1% to 100%, default: 80%).
  * Real-time metadata indicators: `Original Size` vs. `Estimated New Size` vs. `% Saved`.
  * Split-screen interactive before/after image loupe/magnifier.
  * Format preserving toggle (keep input extension vs. auto-convert to WebP).
  * Button: `Download Compressed Image`.
* **Implementation:** Offscreen canvas quantization and iterative quality blob rendering.

### Compress to Target Size
* **Description:** Automatic calculation that dials compression down to hit a specific file ceiling.
* **UI Controls:**
  * Target file size number input box (e.g., `200`).
  * Unit dropdown: `KB` | `MB`.
  * Maximum resolution downscale checkbox: "Allow resolution reduction if compression isn't enough".
  * Progress status text ("Calculating optimum compression pass 3/5...").
  * Button: `Compress to Limit`.
* **Implementation:** Binary search loop testing iterative canvas `quality` parameters until output blob is $\le$ target bytes.

### Bulk Image Processor
* **Description:** Batch execution of resize, convert, and compress routines across multiple files simultaneously.
* **UI Controls:**
  * Multi-file drag zone with file queue list.
  * Unified configuration panel:
    * Target format dropdown: `Original`, `JPG`, `PNG`, `WEBP`.
    * Max dimension constraint: Width/Height bounding box (e.g., `1920px`).
    * Quality slider: `Low (60%)`, `Medium (80%)`, `High (90%)`.
    * Output file naming pattern input (e.g., `{name}-min.{ext}`).
  * Progress bar showing aggregate completion status.
  * Button: `Process Batch & Download (.zip)`.
* **Implementation:** Dedicated Web Worker pool wrapping `OffscreenCanvas` and `JSZip`.

---

# 4. Create & Generate
Visual composition and mockups.

### Device Mockup Generator
* **Description:** Wrap flat screenshots into realistic, presentation-ready device mockups.
* **UI Controls:**
  * Device frame dropdown: `MacBook Pro`, `iPhone 15`, `iPad Air`, `Minimal Browser Chrome`.
  * Frame theme: `Dark Mode` | `Light Mode`.
  * Backdrop styling:
    * Padding slider (10px to 100px).
    * Background style radio: `Gradient Mesh`, `Solid Color`, `Transparent`.
    * Shadow intensity slider (0% to 100%).
  * Button: `Export 4K Mockup`.
* **Implementation:** Multi-layered canvas compositing vector frame overlays with drop shadows around the user's uploaded bitmap.

### Image Splitter (Grid Maker)
* **Description:** Slice photographs into seamless multi-panel tiles for social grids or print banners.
* **UI Controls:**
  * Mode selector: `Instagram Grid (3x1, 3x2, 3x3)` | `Custom Rows & Columns`.
  * Row and column integer stepper inputs.
  * Visual cut lines overlay rendered across image preview.
  * Button: `Download Slices as ZIP`.
* **Implementation:** Sub-rectangle canvas coordinate extraction (`ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, dWidth, dHeight)`).

### Image Stitcher
* **Description:** Merge sequential images or long screenshots into a unified canvas.
* **UI Controls:**
  * Multi-image uploader with drag-and-drop sortable list.
  * Alignment axis: `Vertical (Long Screenshot)` | `Horizontal (Side-by-Side)`.
  * Gap / Border spacing slider (0px to 40px).
  * Spacer background color picker.
  * Alignment option: `Align Center`, `Align Left/Top`, `Align Right/Bottom`.
  * Button: `Stitch & Export`.
* **Implementation:** Dynamic canvas resizing equal to the sum of image widths/heights followed by sequential draw calls.

### Meme Generator
* **Description:** Classic top and bottom caption meme editor with custom typography.
* **UI Controls:**
  * Top text input box.
  * Bottom text input box.
  * Font selector: `Impact`, `Montserrat`, `Arial Black`, `Comic Sans`.
  * Font size slider with auto-fit checkbox.
  * Text fill color and outline stroke color pickers.
  * "All Caps" toggle switch.
  * Draggable text anchor handles directly on preview.
  * Button: `Download Meme`.
* **Implementation:** Canvas text rendering with `ctx.strokeText()` outline and `ctx.fillText()`.

### Watermark Image
* **Description:** Protect intellectual property with repeated or anchored watermarks.
* **UI Controls:**
  * Watermark type tabs: `Text Watermark` | `Logo Image`.
  * Text input or secondary logo file uploader.
  * Placement mode: `9-Point Anchor Grid (Top-Left, Center, etc.)` vs. `Tiled / Repeated Pattern`.
  * Opacity slider (5% to 100%).
  * Scale / Font size slider.
  * Rotation angle slider (-180° to +180°).
  * Button: `Export Watermarked Image`.
* **Implementation:** Canvas alpha overlay and pattern filling (`ctx.createPattern`).

---

# 5. Developer & Tech Tools
Specialized pixel-level and metadata processing utilities.

### Base64 Encoder / Decoder
* **Description:** Convert image assets into inline Data URI strings and reconstruct images from Base64 code.
* **UI Controls:**
  * Mode tabs: `Image to Base64` | `Base64 to Image`.
  * When Image to Base64:
    * File dropzone.
    * Textarea showing generated `data:image/...;base64,...` string.
    * Toggle: `Include HTML <img> tag` | `Include CSS background-image` | `Raw URI only`.
    * Button: `Copy String to Clipboard`.
  * When Base64 to Image:
    * Textarea to paste Base64 code.
    * Real-time image render preview box.
    * Button: `Download Decoded File`.
* **Implementation:** `FileReader.readAsDataURL()` and direct `Image.src` rendering.

### Color Palette Extractor
* **Description:** Sample dominant visual color schemes and inspect individual pixels.
* **UI Controls:**
  * Native Eyedropper API activation button: `Pick Any Pixel on Screen`.
  * Palette count slider (`Extract 3 to 8 Dominant Colors`).
  * Swatch cards displaying color preview, HEX code, and RGB values.
  * Click-to-copy feedback on each swatch card.
  * Button: `Export as JSON`, `Export as CSS Variables`, `Download Palette Image`.
* **Implementation:** Color quantization algorithm (Median Cut / K-Means) processing `ctx.getImageData()`.

### EXIF Data Viewer & Stripper
* **Description:** Inspect hidden camera metadata and scrub tracking data before sharing.
* **UI Controls:**
  * EXIF overview table: Camera Model, Lens, ISO, F-Number, Shutter Speed, Focal Length, Software, Date Taken.
  * Geolocation map widget (renders preview if GPS coordinates are present in EXIF).
  * Button: `Download Clean Image (Strip All EXIF Metadata)`.
* **Implementation:** Metadata extraction via `exif-js` or `exifr`. Stripping achieved by redrawing image on canvas (which natively purges EXIF markers).

### Favicon Generator
* **Description:** Generate standard browser icons, mobile web app manifest icons, and Apple touch icons from a single source.
* **UI Controls:**
  * Square crop preview window with live browser tab mockup.
  * Size selection checkboxes: `16x16`, `32x32`, `48x48`, `180x180 (Apple Touch)`, `192x192 (Android)`, `512x512 (PWA)`.
  * Output option: `Single multi-resolution .ico` and/or `PNG Pack with site.webmanifest`.
  * Button: `Download Complete Favicon ZIP`.
* **Implementation:** Scaled canvas draw passes zipped via `JSZip`.

### Placeholder Image Generator
* **Description:** Generate custom dummy images with customizable dimensions, colors, and labels for design mockups.
* **UI Controls:**
  * Width and Height numerical inputs (px).
  * Quick aspect ratio chips: `Banner (1200x630)`, `Card (600x400)`, `Square (500x500)`.
  * Background solid color picker.
  * Text label input box (defaults to `{width} × {height}`).
  * Text color picker and font size slider.
  * Format dropdown: `PNG` | `JPG` | `SVG`.
  * Button: `Copy Data URL`, `Download Placeholder`.
* **Implementation:** Dynamic `<canvas>` generation and SVG XML data-URL serialization.
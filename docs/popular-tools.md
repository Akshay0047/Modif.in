# Popular tool selection

Reviewed October 20, 2026.

“Popular” is an editorial shortcut to likely common tasks, not a ranking of measured MODIF.in usage. The repository has no aggregate tool-usage data. The order below combines the app's broad audience, current tool capabilities, and the prominence of comparable tasks in established products. These sources establish useful task categories; they do not establish relative search volume or MODIF.in demand.

Each hub highlights eight tools so the first group stays scannable on mobile. Every tool remains available in its original category and through search.

## Text

1. Text Counter — word and character limits for writing, applications, and posts.
2. Case Converter — fix capitalization without retyping.
3. Text Comparison — review changes between two versions.
4. Text Cleaner — clean pasted text and unwanted whitespace.
5. JSON Tools — format and validate a common developer data format.
6. Base64 Encoder / Decoder — inspect and transform encoded text.
7. Password Generator — create passwords and passphrases locally.
8. UUID / ID Generator — generate identifiers for development and test data.

Writing tasks take the first slots to serve students, creators, and everyday users as well as developers. Word counting and capitalization are established editing tasks in [Google Docs](https://support.google.com/docs/answer/39003?hl=en) and [Microsoft Word](https://support.microsoft.com/en-gb/word/change-the-capitalization-or-case-of-text). [DevToys](https://devtoys.app/) includes JSON, Base64, text comparison, passwords, and UUID generation in its built-in toolkit. Text Cleaner earns a slot for the broad copy-and-paste workflow it serves, rather than external popularity evidence.

## Image

1. Compress Image — reduce file size for sharing and uploads.
2. Crop & Resize — change framing and dimensions.
3. Convert to JPG / PNG — switch between widely supported formats.
4. Compress to Target Size — meet upload size limits.
5. HEIC to JPG — make phone photos compatible with more destinations.
6. WEBP Converter — convert images downloaded from or prepared for the web.
7. Image to PDF — combine photos or scans into a document.
8. Rotate & Flip — correct orientation.

Compression, resizing, cropping, and conversion lead the [iLoveIMG](https://www.iloveimg.com/) product navigation. [Apple's HEIF documentation](https://support.apple.com/en-us/116944) describes compatibility constraints and exporting to JPEG or PNG. Target-size compression and image-to-PDF are prioritized by inference from common upload and document-sharing workflows. Specialist creation and metadata tools retain their category listings.

## Docs

1. PDF Merger — combine documents.
2. PDF Compressor — reduce attachment and upload size.
3. PDF Splitter — extract pages or separate a document.
4. To PDF — create a portable document from supported input formats.
5. From PDF — export page images, text, or Markdown.
6. PDF Editor — add and adjust document content.
7. E-Signature — place a signature in a PDF.
8. OCR — extract text from supported scanned content.

Merge, split, compression, conversion, editing, and signing appear prominently in [iLovePDF's toolkit](https://www.ilovepdf.com/). OCR covers the separate scanned-document workflow. This selection favors general document work over narrower redaction, watermarking, and CSV tasks. “From PDF” must not be advertised as PDF-to-Word conversion: the implemented exports are images, text, and Markdown.

## Maintenance

- Edit `textPopularToolOrder`, `imagePopularToolOrder`, or `docPopularToolOrder` in `src/data/*Tools.js`. Each ordered list owns both the highlight flag and the first-group order; do not add separate popularity flags to tool entries.
- The Text, Image, and Docs hub pages pass their matching order to the shared `ToolHub`.
- Run `node --test tests/text-and-shell/catalog-popular.test.mjs` after changes. It checks unique, implemented selections and matching hub order.
- Revisit the selection when capabilities or the intended audience change. If aggregate usage evidence becomes available through an explicitly approved privacy design, use it to revise this editorial estimate. No analytics collection was added for this review.

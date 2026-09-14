# Text.modif.in
---


# 1. Text Analysis

Tools for measuring, comparing, and understanding text.

1. **Text Counter**
    
    - Words
        
    - Characters
        
    - Characters with/without spaces
        
    - Sentences
        
    - Paragraphs
        
    - Lines
        
        
2. **Text Statistics**
    
    - Average word length
        
    - Average sentence length
        
    - Letter/character frequency
        
    - Word frequency
        
    - Readability-related basic statistics
        
3. **Reading or Speaking Time**
    
    - Estimated reading time
        
    - Estimated speaking time
        
    - Adjustable reading/speaking speed
        
4. **Text Comparison**
    
    - Side-by-side comparison
        
    - Added/removed/changed text
        
    - Word-level or character-level diff
        
5. **Duplicate Finder**
    
    - Duplicate words
        
    - Repeated sentences
        
    - Duplicate lines
        
6. **Whitespace Analyzer**
    
    - Leading/trailing spaces
        
    - Consecutive spaces
        
    - Tabs
        
    - Empty lines
        
    - Unusual whitespace
        

---

# 2. Text Formatter & Converter

Tools that change text's case, structure, or appearance.

1. **Case Converter**
    
    - UPPERCASE
        
    - lowercase
        
    - Title Case
        
    - Sentence case
        
    - aLtErNaTiNg CaSe
        
    - InVeRsE cAsE
        
2. **Fancy Text Converter** (Entering text gives all the outputs combined)
    
    - Bold-style Unicode
        
    - Italic-style Unicode
        
    - Circled
        
    - Squared
        
    - Small caps
        
    - Superscript
        
    - Subscript
        
    - Strikethrough
        
    - Underline
        
    - Bubble-style text
        
    - Other Unicode styles
        
3. **Code Case Converter**
    
    - camelCase
        
    - PascalCase
        
    - snake_case
        
    - kebab-case
        
    - CONSTANT_CASE
        
    - dot.case
        
4. **Text Cleaner**
    
    - Remove extra spaces
        
    - Normalize whitespace
        
    - Trim lines
        
    - Remove empty lines
        
    - Remove punctuation
        
    - Remove numbers
        
    - Remove special characters
        
    - Keep only letters/numbers
        
5. **Line Tools**
    
    - Sort lines
        
    - Reverse lines
        
    - Shuffle lines
        
    - Remove duplicate lines
        
    - Join lines
        
    - Split lines
        
6. **Text Reverser**
    
    - Reverse entire text
        
    - Reverse words
        
    - Reverse characters
        
7. **Prefix & Suffix**
    
    - Add text to every line
        
    - Add numbering
        
    - Wrap text
        
    - Indent/unindent
        
8. **Find & Replace**
    
    - Find text
        
    - Replace text
        
    - Replace multiple patterns
        

---

# 3. ASCII, Unicode & Symbols


1. **ASCII & Kaomoji**
    
    - ASCII emojis
        
    - Kaomoji
        
    - Emoticons
        
    - One-line copyable expressions
        
2. **Unicode Symbol Picker**
    
    - Arrows
        
    - Math symbols
        
    - Currency
        
    - Greek letters
        
    - Shapes
        
    - Miscellaneous symbols
        
3. **Special Character Picker**
    
    - Accented characters
        
    - Typographic characters
        
    - Quotes
        
    - Dashes
        
    - Miscellaneous characters
        
4. **Unicode Character Info**
    
    - Character
        
    - Unicode name
        
    - Code point
        
    - UTF-8
        
    - UTF-16
        
    - HTML entity
        
5. **Invisible Character Tools**
    
    - Find invisible characters
        
    - Inspect zero-width characters
        
    - Copy selected invisible characters
        
---

# 4. Generators

Anything primarily designed to generate text, identifiers, dummy data, or random values.

1. **Password Generator**
    
    - Password
        
    - Passphrase
        
    - Length
        
    - Character sets
        
    - Exclude ambiguous characters
        
2. **Username Generator**
    
    - Random usernames
        
    - Style/pattern options
        
    - Word combinations
        
3. **Lorem Ipsum Generator**
    
    - Words
        
    - Sentences
        
    - Paragraphs
        
4. **Fake Data Generator**
    
    - Names
        
    - Emails
        
    - Phone numbers
        
    - Addresses
        
    - Companies
        
    - Dates
        
5. **UUID / ID Generator**
    
    - UUID
        
    - ULID
        
    - NanoID
        
6. **Random Generator**
    
    - Random words
        
    - Random numbers
        
    - Random sentences
        
    - Random names
        
7. **Slug Generator**
    
    - Convert titles/text into URL-friendly slugs
        
8. **Token Generator**
    
    - Random strings
        
    - API-style tokens
        
    - Hex tokens
        
9. **Test Data Generator**
    
    - Simple developer-oriented dummy values
        


---

# 5. Developer Tools

This is where Ascii Toolbox becomes genuinely useful to developers rather than just being a text gimmick site.

1. **JSON Tools**
    
    - Format
        
    - Minify
        
    - Validate
        
    - Sort keys
        
    - JSON ↔ YAML
        
    - JSON ↔ CSV where practical
        
2. **Code Formatter**
    
    - JavaScript
        
    - TypeScript
        
    - HTML
        
    - CSS
        
    - SQL
        
    - JSON
        
    - XML
        
    - Proper indentation
        
    - Pretty-printing (including react jsx and tsx)
        
3. **Code Minifier**
    
    - JavaScript
        
    - CSS
        
    - HTML
        
    - JSON
        
4. **Regex Tester**
    
    - Pattern
        
    - Flags
        
    - Matches
        
    - Capture groups
        
    - Replace preview
        
5. **Markdown Tools**
    
    - Markdown formatter
        
    - Markdown preview
        
6. **JWT Decoder**
    
    - Header
        
    - Payload
        
    - Expiration
        
    - Claims
        
7. **Timestamp Converter**
    
    - Unix timestamp ↔ date/time
        
8. **XML Tools**
    
    - Format
        
    - Validate
        
    - Minify
        
9. **HTML Entity Tools**
    
    - Encode
        
    - Decode
        
10. **Query String Tools**
    

- Parse
    
- Generate
    

The important change here is **Code Formatter**: this should explicitly support **proper indentation / pretty formatting**, which you wanted to add.

For example:

```text
Input
if(x){if(y){console.log("hi");}}

Output
if (x) {
    if (y) {
        console.log("hi");
    }
}
```

That's much more useful than having a standalone "indent text" utility.

---

# 6. Encode, Decode & Convert

Put transformations involving representations/encodings here.

1. **Base64 Encoder / Decoder**
    
2. **URL Encoder / Decoder**
    
3. **Binary ↔ Text**
    
    - Text ↔ Binary
        
    - Binary ↔ ASCII
        
4. **Hex ↔ Text**
    
    - Text ↔ Hex
        
    - Hex ↔ ASCII
        
5. **ASCII Converter**
    
    - ASCII ↔ Decimal
        
    - ASCII ↔ Hex
        
    - ASCII ↔ Binary
        
6. **Number Base Converter**
    
    - Binary
        
    - Decimal
        
    - Hexadecimal
        
    - Octal
        
7. **Morse Code Converter**
    
    - Text ↔ Morse
        
8. **Unicode Escape Converter**
    
    - Text ↔ Unicode escape sequences
        
9. **Classical Cipher Tools**
    
    - ROT13
        
    - Caesar cipher
        
    - Atbash
        

---

# 7. Web, URL & Security

I would combine these because many of the tools involve URLs, identifiers, hashes, and web-related data, and separating them would create several tiny categories.

### URL & Web

1. **URL Sanitizer**
    
    - Remove tracking parameters
        
    - Normalize URL
        
    - Clean query parameters
        
2. **URL Parser**
    
    - Protocol
        
    - Host
        
    - Port
        
    - Path
        
    - Query
        
    - Fragment
        
3. **URL Validator**
    
    - Check basic URL structure
        
4. **UTM Builder / Cleaner**
    
    - Create UTM URLs
        
    - Remove UTM parameters
        
5. **Meta Tag Generator**
    
    - Title
        
    - Description
        
    - Open Graph
        
    - Twitter/X metadata
        
6. **Robots.txt Generator**
    
7. **Sitemap Generator**
    

### Security

8. **Hash Generator**
    
    - MD5
        
    - SHA-1
        
    - SHA-256
        
    - SHA-512
        
9. **Password Strength Checker**
    
10. **Entropy Calculator**
    
11. **HMAC Generator**
    
12. **PII Detector**
    

- Emails
    
- URLs
    
- Phone numbers
    
- IP addresses
    

This section is the one place where I would retain some security-specific functionality because it naturally complements the URL/developer tools.

---

# Final Site Structure

So the whole site becomes:

```text
ASCII TOOLBOX
│
├── Text Analysis
│   ├── Text Counter
│   ├── Text Statistics
│   ├── Reading or Speaking Time
│   ├── Text Comparison
│   ├── Duplicate Finder
│   └── Whitespace Analyzer
│
├── Text Formatter & Converter
│   ├── Case Converter
│   ├── Fancy Text Converter
│   ├── Code Case Converter
│   ├── Text Cleaner
│   ├── Line Tools
│   ├── Text Reverser
│   ├── Prefix & Suffix
│   └── Find & Replace
│
├── ASCII, Unicode & Symbols
│   ├── ASCII & Kaomoji
│   ├── ASCII Art
│   ├── Unicode Symbol Picker
│   ├── Special Character Picker
│   ├── Unicode Character Info
│   ├── Emoji Picker
│   └── Invisible Character Tools
│
├── Generators
│   ├── Password Generator
│   ├── Username Generator
│   ├── Lorem Ipsum Generator
│   ├── Fake Data Generator
│   ├── UUID / ID Generator
│   ├── Random Generator
│   ├── Slug Generator
│   └── Token Generator
│
├── Developer Tools
│   ├── JSON Tools
│   ├── Code Formatter
│   ├── Code Minifier
│   ├── Regex Tester
│   ├── Markdown Tools
│   ├── JWT Decoder
│   ├── Timestamp Converter
│   ├── XML Tools
│   ├── HTML Entity Tools
│   └── Query String Tools
│
├── Encode, Decode & Convert
│   ├── Base64 Encoder / Decoder
│   ├── URL Encoder / Decoder
│   ├── Binary ↔ Text
│   ├── Hex ↔ Text
│   ├── ASCII Converter
│   ├── Number Base Converter
│   ├── Morse Code Converter
│   ├── Unicode Escape Converter
│   └── Classical Cipher Tools
│
└── Web, URL & Security
    ├── URL Sanitizer
    ├── URL Parser
    ├── URL Validator
    ├── UTM Builder / Cleaner
    ├── Meta Tag Generator
    ├── Robots.txt Generator
    ├── Sitemap Generator
    ├── Hash Generator
    ├── Password Strength Checker
    ├── Entropy Calculator
    ├── HMAC Generator
    └── PII Detector
```


### One addition I'd strongly recommend

Add **Roman Numeral Converter** to **Encode, Decode & Convert**:

> **Roman Numeral Converter**  
> `2026 ↔ MMXXVI`

It is common enough to justify inclusion, while combining conversion and generation into one utility keeps the toolbox clean.

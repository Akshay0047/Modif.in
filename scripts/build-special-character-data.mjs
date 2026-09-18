import { writeFileSync } from "node:fs";

function symbol(char, name) {
    return { char, name };
}

function group(label, symbols) {
    return { label, symbols };
}

function category(id, label, description, groups) {
    return { id, label, description, groups };
}

function letters(entries) {
    return entries.map(([char, name]) => symbol(char, name));
}

const latinLowerA = letters([
    ["á", "a acute"], ["à", "a grave"], ["â", "a circumflex"], ["ä", "a diaeresis"],
    ["ã", "a tilde"], ["å", "a ring above"], ["ą", "a ogonek"], ["ă", "a breve"],
    ["ā", "a macron"], ["ǎ", "a caron"], ["ȧ", "a dot above"], ["ǡ", "a dot above macron"],
    ["ǟ", "a diaeresis macron"], ["ǣ", "ae macron"], ["æ", "ae ligature"],
]);
const latinLowerE = letters([
    ["é", "e acute"], ["è", "e grave"], ["ê", "e circumflex"], ["ë", "e diaeresis"],
    ["ę", "e ogonek"], ["ě", "e caron"], ["ē", "e macron"], ["ė", "e dot above"],
    ["ȩ", "e cedilla"], ["ḙ", "e circumflex below"],
]);
const latinLowerI = letters([
    ["í", "i acute"], ["ì", "i grave"], ["î", "i circumflex"], ["ï", "i diaeresis"],
    ["į", "i ogonek"], ["ī", "i macron"], ["ǐ", "i caron"], ["ȉ", "i inverted breve"],
    ["ḭ", "i tilde below"],
]);
const latinLowerO = letters([
    ["ó", "o acute"], ["ò", "o grave"], ["ô", "o circumflex"], ["ö", "o diaeresis"],
    ["õ", "o tilde"], ["ø", "o stroke"], ["ő", "o double acute"], ["ō", "o macron"],
    ["ǒ", "o caron"], ["ȯ", "o dot above"], ["œ", "oe ligature"], ["ð", "eth"],
]);
const latinLowerU = letters([
    ["ú", "u acute"], ["ù", "u grave"], ["û", "u circumflex"], ["ü", "u diaeresis"],
    ["ų", "u ogonek"], ["ū", "u macron"], ["ǔ", "u caron"], ["ů", "u ring above"],
    ["ű", "u double acute"], ["ȕ", "u diaeresis macron"],
]);
const latinLowerOther = letters([
    ["ñ", "n tilde"], ["ń", "n acute"], ["ņ", "n cedilla"], ["ň", "n caron"],
    ["ç", "c cedilla"], ["ć", "c acute"], ["č", "c caron"], ["ĉ", "c circumflex"],
    ["ċ", "c dot above"], ["ş", "s cedilla"], ["ś", "s acute"], ["š", "s caron"],
    ["ŝ", "s circumflex"], ["ș", "s comma below"], ["ź", "z acute"], ["ž", "z caron"],
    ["ż", "z dot above"], ["ý", "y acute"], ["ÿ", "y diaeresis"], ["ŷ", "y circumflex"],
    ["ł", "l stroke"], ["ľ", "l caron"], ["ļ", "l cedilla"], ["ĺ", "l acute"],
    ["ř", "r caron"], ["ŕ", "r acute"], ["ŗ", "r cedilla"], ["ď", "d caron"],
    ["đ", "d stroke"], ["ť", "t caron"], ["ţ", "t cedilla"], ["ģ", "g cedilla"],
    ["ğ", "g breve"], ["ġ", "g dot above"], ["ħ", "h bar"], ["ĥ", "h circumflex"],
    ["ĵ", "j circumflex"], ["ķ", "k cedilla"], ["ĸ", "kra"], ["ĺ", "l acute"],
    ["ß", "sharp s"], ["þ", "thorn"], ["ƒ", "f hook"], ["ɐ", "turned a"],
]);

const latinUpperA = letters([
    ["Á", "A acute"], ["À", "A grave"], ["Â", "A circumflex"], ["Ä", "A diaeresis"],
    ["Ã", "A tilde"], ["Å", "A ring above"], ["Ą", "A ogonek"], ["Ă", "A breve"],
    ["Ā", "A macron"], ["Ǎ", "A caron"], ["Ǟ", "A diaeresis macron"], ["Æ", "AE ligature"],
]);
const latinUpperE = letters([
    ["É", "E acute"], ["È", "E grave"], ["Ê", "E circumflex"], ["Ë", "E diaeresis"],
    ["Ę", "E ogonek"], ["Ě", "E caron"], ["Ē", "E macron"], ["Ė", "E dot above"],
]);
const latinUpperI = letters([
    ["Í", "I acute"], ["Ì", "I grave"], ["Î", "I circumflex"], ["Ï", "I diaeresis"],
    ["Į", "I ogonek"], ["Ī", "I macron"], ["Ǐ", "I caron"],
]);
const latinUpperO = letters([
    ["Ó", "O acute"], ["Ò", "O grave"], ["Ô", "O circumflex"], ["Ö", "O diaeresis"],
    ["Õ", "O tilde"], ["Ø", "O stroke"], ["Ő", "O double acute"], ["Ō", "O macron"],
    ["Œ", "OE ligature"], ["Ð", "Eth"],
]);
const latinUpperU = letters([
    ["Ú", "U acute"], ["Ù", "U grave"], ["Û", "U circumflex"], ["Ü", "U diaeresis"],
    ["Ų", "U ogonek"], ["Ū", "U macron"], ["Ǔ", "U caron"], ["Ů", "U ring above"],
    ["Ű", "U double acute"],
]);
const latinUpperOther = letters([
    ["Ñ", "N tilde"], ["Ń", "N acute"], ["Ņ", "N cedilla"], ["Ň", "N caron"],
    ["Ç", "C cedilla"], ["Ć", "C acute"], ["Č", "C caron"], ["Ĉ", "C circumflex"],
    ["Ś", "S acute"], ["Š", "S caron"], ["Ş", "S cedilla"], ["Ź", "Z acute"],
    ["Ž", "Z caron"], ["Ż", "Z dot above"], ["Ý", "Y acute"], ["Ÿ", "Y diaeresis"],
    ["Ł", "L stroke"], ["Ľ", "L caron"], ["Ř", "R caron"], ["Ď", "D caron"],
    ["Đ", "D stroke"], ["Ť", "T caron"], ["Ğ", "G breve"], ["Ħ", "H bar"],
    ["Ĵ", "J circumflex"], ["Ķ", "K cedilla"], ["Þ", "Thorn"], ["ẞ", "Capital sharp s"],
]);

const cyrillicLower = letters([
    ["а", "Cyrillic a"], ["б", "Cyrillic be"], ["в", "Cyrillic ve"], ["г", "Cyrillic ghe"],
    ["д", "Cyrillic de"], ["е", "Cyrillic ie"], ["ё", "Cyrillic io"], ["ж", "Cyrillic zhe"],
    ["з", "Cyrillic ze"], ["и", "Cyrillic i"], ["й", "Cyrillic short i"], ["к", "Cyrillic ka"],
    ["л", "Cyrillic el"], ["м", "Cyrillic em"], ["н", "Cyrillic en"], ["о", "Cyrillic o"],
    ["п", "Cyrillic pe"], ["р", "Cyrillic er"], ["с", "Cyrillic es"], ["т", "Cyrillic te"],
    ["у", "Cyrillic u"], ["ф", "Cyrillic ef"], ["х", "Cyrillic ha"], ["ц", "Cyrillic tse"],
    ["ч", "Cyrillic che"], ["ш", "Cyrillic sha"], ["щ", "Cyrillic shcha"], ["ъ", "Cyrillic hard sign"],
    ["ы", "Cyrillic yeru"], ["ь", "Cyrillic soft sign"], ["э", "Cyrillic e"], ["ю", "Cyrillic yu"],
    ["я", "Cyrillic ya"], ["і", "Cyrillic Ukrainian i"], ["ї", "Cyrillic yi"], ["є", "Cyrillic ye"],
    ["ґ", "Cyrillic ghe with upturn"],
]);
const cyrillicUpper = letters([
    ["А", "Cyrillic A"], ["Б", "Cyrillic Be"], ["В", "Cyrillic Ve"], ["Г", "Cyrillic Ghe"],
    ["Д", "Cyrillic De"], ["Е", "Cyrillic Ie"], ["Ё", "Cyrillic Io"], ["Ж", "Cyrillic Zhe"],
    ["З", "Cyrillic Ze"], ["И", "Cyrillic I"], ["Й", "Cyrillic Short I"], ["К", "Cyrillic Ka"],
    ["Л", "Cyrillic El"], ["М", "Cyrillic Em"], ["Н", "Cyrillic En"], ["О", "Cyrillic O"],
    ["П", "Cyrillic Pe"], ["Р", "Cyrillic Er"], ["С", "Cyrillic Es"], ["Т", "Cyrillic Te"],
    ["У", "Cyrillic U"], ["Ф", "Cyrillic Ef"], ["Х", "Cyrillic Ha"], ["Ц", "Cyrillic Tse"],
    ["Ч", "Cyrillic Che"], ["Ш", "Cyrillic Sha"], ["Щ", "Cyrillic Shcha"], ["Ъ", "Cyrillic Hard sign"],
    ["Ы", "Cyrillic Yeru"], ["Ь", "Cyrillic Soft sign"], ["Э", "Cyrillic E"], ["Ю", "Cyrillic Yu"],
    ["Я", "Cyrillic Ya"], ["І", "Cyrillic Ukrainian I"], ["Ї", "Cyrillic Yi"], ["Є", "Cyrillic Ye"],
    ["Ґ", "Cyrillic Ghe with upturn"],
]);

const greekLower = letters([
    ["α", "Greek alpha"], ["β", "Greek beta"], ["γ", "Greek gamma"], ["δ", "Greek delta"],
    ["ε", "Greek epsilon"], ["ζ", "Greek zeta"], ["η", "Greek eta"], ["θ", "Greek theta"],
    ["ι", "Greek iota"], ["κ", "Greek kappa"], ["λ", "Greek lambda"], ["μ", "Greek mu"],
    ["ν", "Greek nu"], ["ξ", "Greek xi"], ["ο", "Greek omicron"], ["π", "Greek pi"],
    ["ρ", "Greek rho"], ["σ", "Greek sigma"], ["ς", "Greek final sigma"], ["τ", "Greek tau"],
    ["υ", "Greek upsilon"], ["φ", "Greek phi"], ["χ", "Greek chi"], ["ψ", "Greek psi"],
    ["ω", "Greek omega"],
]);
const greekUpper = letters([
    ["Α", "Greek Alpha"], ["Β", "Greek Beta"], ["Γ", "Greek Gamma"], ["Δ", "Greek Delta"],
    ["Ε", "Greek Epsilon"], ["Ζ", "Greek Zeta"], ["Η", "Greek Eta"], ["Θ", "Greek Theta"],
    ["Ι", "Greek Iota"], ["Κ", "Greek Kappa"], ["Λ", "Greek Lambda"], ["Μ", "Greek Mu"],
    ["Ν", "Greek Nu"], ["Ξ", "Greek Xi"], ["Ο", "Greek Omicron"], ["Π", "Greek Pi"],
    ["Ρ", "Greek Rho"], ["Σ", "Greek Sigma"], ["Τ", "Greek Tau"], ["Υ", "Greek Upsilon"],
    ["Φ", "Greek Phi"], ["Χ", "Greek Chi"], ["Ψ", "Greek Psi"], ["Ω", "Greek Omega"],
]);

const categories = [
    category("latin-accented-lower", "Latin Accented (Lowercase)", "Lowercase Latin letters with diacritical marks", [
        group("A variants", latinLowerA),
        group("E variants", latinLowerE),
        group("I variants", latinLowerI),
        group("O variants", latinLowerO),
        group("U variants", latinLowerU),
        group("Other letters", latinLowerOther),
    ]),
    category("latin-accented-upper", "Latin Accented (Uppercase)", "Uppercase Latin letters with diacritical marks", [
        group("A variants", latinUpperA),
        group("E variants", latinUpperE),
        group("I variants", latinUpperI),
        group("O variants", latinUpperO),
        group("U variants", latinUpperU),
        group("Other letters", latinUpperOther),
    ]),
    category("cyrillic", "Cyrillic", "Russian, Ukrainian, and related Cyrillic letters", [
        group("Lowercase", cyrillicLower),
        group("Uppercase", cyrillicUpper),
    ]),
    category("greek", "Greek", "Greek alphabet letters", [
        group("Lowercase", greekLower),
        group("Uppercase", greekUpper),
    ]),
    category("quotes-apostrophes", "Quotes & Apostrophes", "Quotation marks and apostrophe variants", [
        group("Curly quotes", letters([
            ["“", "Left double quotation mark"], ["”", "Right double quotation mark"],
            ["‘", "Left single quotation mark"], ["’", "Right single quotation mark"],
            ["‚", "Single low quotation mark"], ["„", "Double low quotation mark"],
            ["‛", "Single high reversed quotation mark"], ["‟", "Double high reversed quotation mark"],
        ])),
        group("Guillemets & angles", letters([
            ["«", "Left guillemet"], ["»", "Right guillemet"],
            ["‹", "Single left angle quotation mark"], ["›", "Single right angle quotation mark"],
            ["〈", "Left angle bracket"], ["〉", "Right angle bracket"],
            ["《", "Left double angle bracket"], ["》", "Right double angle bracket"],
        ])),
        group("Apostrophes & primes", letters([
            ["'", "Apostrophe"], ["ʼ", "Modifier letter apostrophe"], ["′", "Prime"],
            ["″", "Double prime"], ["‴", "Triple prime"], ["‵", "Reversed prime"],
            ["`", "Grave accent"], ["´", "Acute accent"], ["ˊ", "Modifier letter acute accent"],
        ])),
    ]),
    category("dashes-hyphens", "Dashes & Hyphens", "Hyphens, dashes, and horizontal rules", [
        group("Dashes", letters([
            ["-", "Hyphen-minus"], ["‐", "Hyphen"], ["‑", "Non-breaking hyphen"],
            ["‒", "Figure dash"], ["–", "En dash"], ["—", "Em dash"], ["―", "Horizontal bar"],
            ["⁃", "Hyphen bullet"], ["﹘", "Small em dash"], ["﹣", "Small hyphen-minus"],
        ])),
        group("Underscores & lines", letters([
            ["_", "Low line"], ["＿", "Fullwidth low line"], ["‾", "Overline"],
            ["﹏", "Wavy low line"], ["╌", "Double oblique hyphen"], ["⸺", "Two-em dash"],
            ["⸻", "Three-em dash"],
        ])),
    ]),
    category("spaces-separators", "Spaces & Separators", "Visible space and separator characters", [
        group("Spaces", letters([
            [" ", "Space"], [" ", "Non-breaking space"], [" ", "En space"],
            [" ", "Em space"], [" ", "Thin space"], [" ", "Hair space"],
            [" ", "Four-per-em space"], [" ", "Six-per-em space"],
            [" ", "Figure space"], [" ", "Punctuation space"],
        ]).map((entry, index) => {
            const spaceChars = [
                [" ", "Space"],
                ["\u00a0", "Non-breaking space"],
                ["\u2002", "En space"],
                ["\u2003", "Em space"],
                ["\u2009", "Thin space"],
                ["\u200a", "Hair space"],
                ["\u2005", "Four-per-em space"],
                ["\u2006", "Six-per-em space"],
                ["\u2007", "Figure space"],
                ["\u2008", "Punctuation space"],
            ];
            return symbol(spaceChars[index][0], spaceChars[index][1]);
        })),
        group("Separators", letters([
            ["⸱", "Word separator middle dot"], ["·", "Middle dot"], ["•", "Bullet"],
            ["‣", "Triangular bullet"], ["⁃", "Hyphen bullet"], ["◦", "White bullet"],
            ["▪", "Black small square"], ["▫", "White small square"], ["⁘", "Four dot punctuation"],
            ["⁙", "Five dot punctuation"], ["⁛", "Four dot mark"], ["⁜", "Dotted cross"],
        ])),
    ]),
    category("punctuation", "Punctuation", "Common and typographic punctuation marks", [
        group("Basic punctuation", letters([
            [".", "Full stop"], [",", "Comma"], [";", "Semicolon"], [":", "Colon"],
            ["!", "Exclamation mark"], ["?", "Question mark"], ["…", "Ellipsis"],
            ["¡", "Inverted exclamation mark"], ["¿", "Inverted question mark"],
            ["·", "Interpunct"], ["‧", "Hyphenation point"], ["※", "Reference mark"],
        ])),
        group("Editorial marks", letters([
            ["§", "Section sign"], ["¶", "Pilcrow"], ["†", "Dagger"], ["‡", "Double dagger"],
            ["※", "Reference mark"], ["⁂", "Asterism"], ["⁎", "Low asterisk"],
            ["※", "Reference mark"], ["‖", "Double vertical line"],
        ])),
    ]),
    category("typography-ligatures", "Typography & Ligatures", "Typographic ligatures and special letter forms", [
        group("Ligatures", letters([
            ["ﬀ", "ff ligature"], ["ﬁ", "fi ligature"], ["ﬂ", "fl ligature"],
            ["ﬃ", "ffi ligature"], ["ﬄ", "ffl ligature"], ["ﬅ", "Long s t ligature"],
            ["ﬆ", "st ligature"], ["ꜳ", "ao ligature"], ["œ", "oe ligature"],
            ["æ", "ae ligature"], ["ĳ", "ij ligature"], ["ȸ", "db ligature"],
        ])),
        group("Special forms", letters([
            ["ª", "Feminine ordinal indicator"], ["º", "Masculine ordinal indicator"],
            ["№", "Numero sign"], ["℅", "Care of"], ["℞", "Prescription take"],
            ["℗", "Sound recording copyright"], ["℡", "Telephone sign"],
            ["℠", "Service mark"], ["™", "Trade mark sign"], ["©", "Copyright"],
            ["®", "Registered sign"],
        ])),
    ]),
    category("math-operators", "Math Operators", "Arithmetic and operator symbols", [
        group("Basic operators", letters([
            ["+", "Plus sign"], ["−", "Minus sign"], ["×", "Multiplication sign"],
            ["÷", "Division sign"], ["±", "Plus-minus sign"], ["∓", "Minus-plus sign"],
            ["=", "Equals sign"], ["≠", "Not equal to"], ["≈", "Almost equal to"],
            ["≡", "Identical to"], ["∼", "Tilde operator"], ["≃", "Asymptotically equal to"],
        ])),
        group("Comparisons", letters([
            ["<", "Less-than sign"], [">", "Greater-than sign"], ["≤", "Less-than or equal to"],
            ["≥", "Greater-than or equal to"], ["≪", "Much less-than"], ["≫", "Much greater-than"],
            ["≲", "Less-than or equivalent to"], ["≳", "Greater-than or equivalent to"],
            ["≶", "Less-than over greater-than"], ["≷", "Greater-than over less-than"],
        ])),
        group("Advanced operators", letters([
            ["√", "Square root"], ["∛", "Cube root"], ["∜", "Fourth root"],
            ["∞", "Infinity"], ["∝", "Proportional to"], ["∴", "Therefore"],
            ["∵", "Because"], ["∎", "End of proof"], ["∅", "Empty set"],
            ["∆", "Increment"], ["∇", "Nabla"], ["∂", "Partial differential"],
        ])),
    ]),
    category("math-advanced", "Math Advanced", "Calculus, sets, logic, and advanced notation", [
        group("Calculus & sums", letters([
            ["∫", "Integral"], ["∬", "Double integral"], ["∭", "Triple integral"],
            ["∮", "Contour integral"], ["∑", "N-ary summation"], ["∏", "N-ary product"],
            ["∐", "N-ary coproduct"], ["∧", "Logical and"], ["∨", "Logical or"],
            ["¬", "Not sign"], ["⊕", "Circled plus"], ["⊗", "Circled times"],
        ])),
        group("Set theory", letters([
            ["∈", "Element of"], ["∉", "Not an element of"], ["⊂", "Subset of"],
            ["⊃", "Superset of"], ["⊆", "Subset of or equal to"], ["⊇", "Superset of or equal to"],
            ["∪", "Union"], ["∩", "Intersection"], ["∖", "Set minus"], ["⊄", "Not a subset of"],
            ["⊅", "Not a superset of"], ["⊊", "Subset with not equal to"],
        ])),
        group("Logic & quantifiers", letters([
            ["∀", "For all"], ["∃", "There exists"], ["∄", "There does not exist"],
            ["∴", "Therefore"], ["∵", "Because"], ["⊢", "Proves"], ["⊨", "Models"],
            ["⊥", "Up tack"], ["⊤", "Down tack"], ["⊢", "Proves"],
        ])),
    ]),
    category("fractions-numbers", "Fractions & Numbers", "Fractions, superscripts, and number forms", [
        group("Common fractions", letters([
            ["½", "One half"], ["⅓", "One third"], ["⅔", "Two thirds"], ["¼", "One quarter"],
            ["¾", "Three quarters"], ["⅕", "One fifth"], ["⅖", "Two fifths"], ["⅗", "Three fifths"],
            ["⅘", "Four fifths"], ["⅙", "One sixth"], ["⅚", "Five sixths"], ["⅛", "One eighth"],
            ["⅜", "Three eighths"], ["⅝", "Five eighths"], ["⅞", "Seven eighths"],
        ])),
        group("Superscripts & subscripts", letters([
            ["⁰", "Superscript zero"], ["¹", "Superscript one"], ["²", "Superscript two"],
            ["³", "Superscript three"], ["⁴", "Superscript four"], ["⁵", "Superscript five"],
            ["⁶", "Superscript six"], ["⁷", "Superscript seven"], ["⁸", "Superscript eight"],
            ["⁹", "Superscript nine"], ["₀", "Subscript zero"], ["₁", "Subscript one"],
            ["₂", "Subscript two"], ["₃", "Subscript three"], ["₄", "Subscript four"],
        ])),
        group("Roman numerals", letters([
            ["Ⅰ", "Roman one"], ["Ⅱ", "Roman two"], ["Ⅲ", "Roman three"], ["Ⅳ", "Roman four"],
            ["Ⅴ", "Roman five"], ["Ⅵ", "Roman six"], ["Ⅶ", "Roman seven"], ["Ⅷ", "Roman eight"],
            ["Ⅸ", "Roman nine"], ["Ⅹ", "Roman ten"], ["Ⅺ", "Roman eleven"], ["Ⅻ", "Roman twelve"],
            ["Ⅼ", "Roman fifty"], ["Ⅽ", "Roman one hundred"], ["Ⅾ", "Roman five hundred"],
            ["Ⅿ", "Roman one thousand"],
        ])),
    ]),
    category("currency", "Currency", "Currency symbols from around the world", [
        group("Major currencies", letters([
            ["$", "Dollar sign"], ["€", "Euro sign"], ["£", "Pound sign"], ["¥", "Yen sign"],
            ["₹", "Indian rupee sign"], ["₩", "Won sign"], ["₽", "Ruble sign"], ["₿", "Bitcoin sign"],
            ["¢", "Cent sign"], ["₱", "Peso sign"], ["₫", "Dong sign"], ["₪", "Shekel sign"],
        ])),
        group("More currencies", letters([
            ["₴", "Hryvnia sign"], ["₦", "Naira sign"], ["₡", "Colon sign"], ["₲", "Guarani sign"],
            ["₭", "Kip sign"], ["₮", "Tugrik sign"], ["₯", "Drachma sign"], ["₠", "Ecu sign"],
            ["₢", "Austral sign"], ["₣", "French franc sign"], ["₤", "Lira sign"], ["₥", "Mill sign"],
            ["₧", "Peseta sign"], ["₨", "Rupee sign"], ["₭", "Kip sign"], ["₼", "Manat sign"],
            ["₾", "Lari sign"], ["₺", "Turkish lira sign"], ["₸", "Tenge sign"], ["₼", "Manat sign"],
        ])),
    ]),
    category("units-science", "Units & Science", "Scientific, measurement, and unit symbols", [
        group("Temperature & angles", letters([
            ["°", "Degree sign"], ["℃", "Degree Celsius"], ["℉", "Degree Fahrenheit"],
            ["′", "Arcminute"], ["″", "Arcsecond"], ["∠", "Angle"], ["∡", "Measured angle"],
            ["⊾", "Right angle"], ["∟", "Right angle"], ["⊿", "Right triangle"],
        ])),
        group("Science symbols", letters([
            ["µ", "Micro sign"], ["Ω", "Ohm sign"], ["Å", "Angstrom sign"], ["Å", "Angstrom sign"],
            ["℧", "Mho sign"], ["℥", "Ounce sign"], ["℔", "Lb bar"], ["ℵ", "Aleph symbol"],
            ["ℶ", "Bet symbol"], ["ℷ", "Gimel symbol"], ["ℸ", "Dalet symbol"],
            ["‰", "Per mille sign"], ["‱", "Per ten thousand sign"], ["℅", "Care of"],
        ])),
    ]),
    category("arrows", "Arrows", "Directional and decorative arrows", [
        group("Basic arrows", letters([
            ["←", "Leftwards arrow"], ["→", "Rightwards arrow"], ["↑", "Upwards arrow"], ["↓", "Downwards arrow"],
            ["↔", "Left right arrow"], ["↕", "Up down arrow"], ["⇐", "Leftwards double arrow"],
            ["⇒", "Rightwards double arrow"], ["⇑", "Upwards double arrow"], ["⇓", "Downwards double arrow"],
            ["⇔", "Left right double arrow"], ["⇕", "Up down double arrow"],
        ])),
        group("Curved & hook arrows", letters([
            ["↩", "Leftwards arrow with hook"], ["↪", "Rightwards arrow with hook"],
            ["↫", "Leftwards arrow with loop"], ["↬", "Rightwards arrow with loop"],
            ["↰", "Upwards arrow with tip left"], ["↱", "Upwards arrow with tip right"],
            ["↲", "Downwards arrow with tip left"], ["↳", "Downwards arrow with tip right"],
            ["⤴", "Arrow pointing rightwards then curving upwards"],
            ["⤵", "Arrow pointing rightwards then curving downwards"],
            ["↶", "Anticlockwise top semicircle arrow"], ["↷", "Clockwise top semicircle arrow"],
        ])),
        group("Heavy & circle arrows", letters([
            ["➔", "Heavy black-feathered rightwards arrow"], ["➜", "Heavy round-tipped rightwards arrow"],
            ["➝", "Heavy rightwards arrow"], ["➞", "Heavy north east arrow"], ["➟", "Drafting point rightwards arrow"],
            ["➠", "Heavy round-tipped rightwards arrow"], ["➡", "Black rightwards arrow"],
            ["⬅", "Black leftwards arrow"], ["⬆", "Black upwards arrow"], ["⬇", "Black downwards arrow"],
            ["↺", "Anticlockwise open circle arrow"], ["↻", "Clockwise open circle arrow"],
            ["⟲", "Anticlockwise gapped circle arrow"], ["⟳", "Clockwise gapped circle arrow"],
        ])),
    ]),
    category("shapes", "Geometric Shapes", "Circles, squares, triangles, and polygons", [
        group("Circles", letters([
            ["●", "Black circle"], ["○", "White circle"], ["◉", "Fisheye"], ["◎", "Bullseye"],
            ["◐", "Circle with left half black"], ["◑", "Circle with right half black"],
            ["◒", "Circle with lower half black"], ["◓", "Circle with upper half black"],
            ["◔", "Circle with upper right quadrant black"], ["◕", "Circle with all but upper left quadrant black"],
        ])),
        group("Squares & diamonds", letters([
            ["■", "Black square"], ["□", "White square"], ["▪", "Black small square"],
            ["▫", "White small square"], ["◆", "Black diamond"], ["◇", "White diamond"],
            ["◈", "White diamond containing black small diamond"], ["⬛", "Black large square"],
            ["⬜", "White large square"], ["🔲", "Black square button"], ["🔳", "White square button"],
        ])),
        group("Triangles & polygons", letters([
            ["▲", "Black up-pointing triangle"], ["△", "White up-pointing triangle"],
            ["▼", "Black down-pointing triangle"], ["▽", "White down-pointing triangle"],
            ["◀", "Black left-pointing triangle"], ["▶", "Black right-pointing triangle"],
            ["◁", "White left-pointing triangle"], ["▷", "White right-pointing triangle"],
            ["⬢", "Black hexagon"], ["⬡", "White hexagon"], ["⬠", "White pentagon"],
            ["⬟", "Black pentagon"],
        ])),
    ]),
    category("stars-asterisks", "Stars & Asterisks", "Star shapes and asterisk variants", [
        group("Stars", letters([
            ["★", "Black star"], ["☆", "White star"], ["✦", "Black four pointed star"],
            ["✧", "White four pointed star"], ["✩", "Stress outlined white star"],
            ["✪", "Circled white star"], ["✫", "Open centre black star"], ["✬", "Black centre white star"],
            ["✭", "Outlined black star"], ["✮", "Heavy outlined black star"], ["✯", "Pinwheel star"],
            ["✰", "Shadowed white star"], ["⁂", "Asterism"], ["⁎", "Low asterisk"],
            ["⁑", "Two asterisks aligned vertically"], ["⁕", "Flower punctuation mark"],
        ])),
        group("Asterisks", letters([
            ["*", "Asterisk"], ["⁎", "Low asterisk"], ["⁑", "Two asterisks aligned vertically"],
            ["※", "Reference mark"], ["⁂", "Asterism"], ["✱", "Heavy asterisk"],
            ["✲", "Open centre asterisk"], ["✳", "Eight spoked asterisk"], ["✴", "Eight pointed black star"],
            ["✵", "Eight pointed pinwheel star"], ["✶", "Six pointed black star"], ["✷", "Eight pointed rectilinear black star"],
        ])),
    ]),
    category("checks-crosses", "Checks & Crosses", "Check marks, crosses, and ballot symbols", [
        group("Checks", letters([
            ["✓", "Check mark"], ["✔", "Heavy check mark"], ["☑", "Ballot box with check"],
            ["✅", "White heavy check mark"], ["✓", "Check mark"], ["√", "Square root"],
            ["⍻", "Check mark"], ["☒", "Ballot box with x"],
        ])),
        group("Crosses", letters([
            ["✗", "Ballot x"], ["✘", "Heavy ballot x"], ["☒", "Ballot box with x"],
            ["❌", "Cross mark"], ["❎", "Cross mark button"], ["×", "Multiplication sign"],
            ["╳", "Box drawings light diagonal cross"], ["✕", "Multiplication x"],
            ["✖", "Heavy multiplication x"],
        ])),
    ]),
    category("hearts-cards", "Hearts & Card Suits", "Hearts, love symbols, and playing card suits", [
        group("Hearts", letters([
            ["♥", "Black heart suit"], ["♡", "White heart suit"], ["❤", "Heavy black heart"],
            ["❥", "Rotated heavy black heart bullet"], ["❣", "Heavy heart exclamation mark ornament"],
            ["💕", "Two hearts"], ["💖", "Sparkling heart"], ["💗", "Growing heart"],
            ["💘", "Heart with arrow"], ["💙", "Blue heart"], ["💚", "Green heart"],
            ["💛", "Yellow heart"], ["💜", "Purple heart"], ["🖤", "Black heart"],
        ])),
        group("Card suits", letters([
            ["♠", "Black spade suit"], ["♣", "Black club suit"], ["♦", "Black diamond suit"],
            ["♤", "White spade suit"], ["♧", "White club suit"], ["♢", "White diamond suit"],
            ["🂠", "Playing card back"], ["🃏", "Joker"],
        ])),
    ]),
    category("music", "Music", "Musical notes, symbols, and notation", [
        group("Notes", letters([
            ["♩", "Quarter note"], ["♪", "Eighth note"], ["♫", "Beamed eighth notes"],
            ["♬", "Beamed sixteenth notes"], ["♭", "Flat"], ["♮", "Natural"],
            ["♯", "Sharp"], ["𝄞", "G clef"], ["𝄢", "F clef"], ["𝄡", "C clef"],
            ["𝄪", "Double sharp"], ["𝄫", "Double flat"],
        ])),
        group("Symbols", letters([
            ["♩", "Quarter note"], ["♯", "Sharp"], ["♭", "Flat"], ["♮", "Natural"],
            ["𝄽", "Short barline"], ["𝄾", "Barline"], ["𝄿", "Final barline"],
            ["𝅗", "Whole note"], ["𝅘", "Half note"], ["𝅙", "Quarter note"],
        ])),
    ]),
    category("weather-nature", "Weather & Nature", "Weather, plants, and nature symbols", [
        group("Weather", letters([
            ["☀", "Black sun with rays"], ["☁", "Cloud"], ["☂", "Umbrella"], ["☃", "Snowman"],
            ["☄", "Comet"], ["☔", "Umbrella with rain drops"], ["⛅", "Sun behind cloud"],
            ["⛆", "Rain"], ["❄", "Snowflake"], ["❅", "Tight trifoliate snowflake"],
            ["❆", "Heavy chevron snowflake"], ["☼", "White sun with rays"],
            ["☽", "First quarter moon"], ["☾", "Last quarter moon"],
        ])),
        group("Nature", letters([
            ["✿", "Black florette"], ["❀", "White florette"], ["❁", "Eight petalled outlined black florette"],
            ["❃", "Heavy teardrop-spoked pinwheel asterisk"], ["🌸", "Cherry blossom"],
            ["🌹", "Rose"], ["🌺", "Hibiscus"], ["🌻", "Sunflower"], ["🌼", "Blossom"],
            ["🌿", "Herb"], ["🍀", "Four leaf clover"], ["🍁", "Maple leaf"],
            ["🍂", "Fallen leaf"], ["🍃", "Leaf fluttering in wind"],
        ])),
    ]),
    category("hands-gestures", "Hands & Gestures", "Hand gestures and pointing symbols", [
        group("Hands", letters([
            ["👍", "Thumbs up"], ["👎", "Thumbs down"], ["👊", "Oncoming fist"], ["✊", "Raised fist"],
            ["✋", "Raised hand"], ["👋", "Waving hand"], ["🤚", "Raised back of hand"],
            ["🖐", "Hand with fingers splayed"], ["✌", "Victory hand"], ["🤞", "Crossed fingers"],
            ["🤟", "Love-you gesture"], ["🤘", "Sign of the horns"], ["🤙", "Call me hand"],
            ["👌", "OK hand"], ["🤏", "Pinching hand"], ["👈", "Backhand index pointing left"],
            ["👉", "Backhand index pointing right"], ["👆", "Backhand index pointing up"],
            ["👇", "Backhand index pointing down"], ["☝", "Index pointing up"],
        ])),
        group("Gestures", letters([
            ["👏", "Clapping hands"], ["🙌", "Raising hands"], ["🙏", "Folded hands"],
            ["🤝", "Handshake"], ["🤲", "Palms up together"], ["👐", "Open hands"],
            ["🤘", "Sign of the horns"], ["✍", "Writing hand"], ["💅", "Nail polish"],
            ["🤳", "Selfie"],
        ])),
    ]),
    category("faces-emotion", "Faces & Emotion", "Facial expressions and emotive symbols", [
        group("Faces", letters([
            ["☺", "White smiling face"], ["☻", "Black smiling face"], ["☹", "White frowning face"],
            ["😀", "Grinning face"], ["😁", "Beaming face with smiling eyes"], ["😂", "Face with tears of joy"],
            ["😃", "Grinning face with big eyes"], ["😄", "Grinning face with smiling eyes"],
            ["😅", "Grinning face with sweat"], ["😆", "Grinning squinting face"],
            ["😉", "Winking face"], ["😊", "Smiling face with smiling eyes"],
            ["😋", "Face savoring food"], ["😎", "Smiling face with sunglasses"],
            ["😍", "Smiling face with heart-eyes"], ["😢", "Crying face"], ["😭", "Loudly crying face"],
            ["😡", "Pouting face"], ["🤔", "Thinking face"], ["🤨", "Face with raised eyebrow"],
            ["🤩", "Star-struck"], ["🥳", "Partying face"],
        ])),
    ]),
    category("brackets", "Brackets & Braces", "Parentheses, brackets, braces, and delimiters", [
        group("Round & square", letters([
            ["(", "Left parenthesis"], [")", "Right parenthesis"], ["[", "Left square bracket"],
            ["]", "Right square bracket"], ["{", "Left curly bracket"], ["}", "Right curly bracket"],
            ["⌈", "Left ceiling"], ["⌉", "Right ceiling"], ["⌊", "Left floor"], ["⌋", "Right floor"],
        ])),
        group("Angle & corner brackets", letters([
            ["⟨", "Mathematical left angle bracket"], ["⟩", "Mathematical right angle bracket"],
            ["《", "Left double angle bracket"], ["》", "Right double angle bracket"],
            ["「", "Left corner bracket"], ["」", "Right corner bracket"],
            ["『", "Left white corner bracket"], ["』", "Right white corner bracket"],
            ["【", "Left black lenticular bracket"], ["】", "Right black lenticular bracket"],
            ["〔", "Left tortoise shell bracket"], ["〕", "Right tortoise shell bracket"],
            ["〖", "Left white lenticular bracket"], ["〗", "Right white lenticular bracket"],
        ])),
        group("Double & ornamental", letters([
            ["⟦", "Mathematical left white square bracket"], ["⟧", "Mathematical right white square bracket"],
            ["⁅", "Left square bracket with quill"], ["⁆", "Right square bracket with quill"],
            ["❰", "Light left tortoise shell bracket ornament"], ["❱", "Light right tortoise shell bracket ornament"],
            ["❲", "Medium left parenthesis ornament"], ["❳", "Medium right parenthesis ornament"],
        ])),
    ]),
    category("keyboard-technical", "Keyboard & Technical", "Keyboard symbols and technical icons", [
        group("Keyboard keys", letters([
            ["⌘", "Place of interest sign"], ["⌥", "Option key"], ["⌃", "Up arrowhead"],
            ["⌫", "Erase to the left"], ["⌦", "Erase to the right"], ["⏎", "Return symbol"],
            ["⏏", "Eject symbol"], ["⎋", "Escape"], ["⇥", "Tab symbol"], ["⇤", "Tab with shift"],
            ["⇪", "Caps lock"], ["⌤", "Enter key"], ["⏎", "Return"],
        ])),
        group("Technical symbols", letters([
            ["⌛", "Hourglass"], ["⏳", "Hourglass with flowing sand"], ["⏰", "Alarm clock"],
            ["⏱", "Stopwatch"], ["⏲", "Timer clock"], ["⌚", "Watch"], ["⌛", "Hourglass"],
            ["⚙", "Gear"], ["⚡", "High voltage sign"], ["⚠", "Warning sign"],
            ["☢", "Radioactive sign"], ["☣", "Biohazard sign"], ["⛔", "No entry"],
            ["⛎", "Ophiuchus"], ["♈", "Aries"], ["♉", "Taurus"],
        ])),
    ]),
    category("decorative", "Decorative & Ornaments", "Flourishes, ornaments, and decorative marks", [
        group("Flourishes", letters([
            ["✿", "Black florette"], ["❀", "White florette"], ["❁", "Eight petalled outlined black florette"],
            ["✤", "Heavy teardrop-spoked pinwheel asterisk"], ["✥", "Eight pointed rectilinear black star"],
            ["✢", "Four teardrop-spoked asterisk"], ["✣", "Four balloon-spoked asterisk"],
            ["✤", "Heavy teardrop-spoked pinwheel asterisk"], ["✥", "Eight pointed rectilinear black star"],
            ["✦", "Black four pointed star"], ["✧", "White four pointed star"],
            ["❦", "Floral heart"], ["❧", "Rotated floral heart bullet"],
            ["☙", "Reversed rotated floral heart bullet"], ["☘", "Shamrock"],
        ])),
        group("Ornaments", letters([
            ["☙", "Reversed rotated floral heart bullet"], ["❦", "Floral heart"],
            ["✾", "Six petalled black and white florette"], ["✽", "Heavy eight pointed rectilinear black star"],
            ["✼", "Open centre teardrop-spoked asterisk"], ["✻", "Teardrop-spoked asterisk"],
            ["✺", "Sixteen pointed asterisk"], ["✹", "Twelve pointed black star"],
            ["✸", "Light four pointed black cusp"], ["✷", "Eight pointed rectilinear black star"],
            ["⁕", "Flower punctuation mark"], ["※", "Reference mark"],
        ])),
    ]),
    category("east-asian", "East Asian", "CJK punctuation and common symbols", [
        group("Punctuation", letters([
            ["、", "Ideographic comma"], ["。", "Ideographic full stop"], ["・", "Katakana middle dot"],
            ["「", "Left corner bracket"], ["」", "Right corner bracket"],
            ["『", "Left white corner bracket"], ["』", "Right white corner bracket"],
            ["【", "Left black lenticular bracket"], ["】", "Right black lenticular bracket"],
            ["〔", "Left tortoise shell bracket"], ["〕", "Right tortoise shell bracket"],
            ["《", "Left double angle bracket"], ["》", "Right double angle bracket"],
        ])),
        group("Symbols", letters([
            ["々", "Ideographic iteration mark"], ["〆", "Ideographic closing mark"],
            ["〇", "Ideographic number zero"], ["〒", "Postal mark"],
            ["〓", "Geta mark"], ["〠", "Postal mark face"], ["〶", "Yen sign"],
            ["㊊", "Circled ideograph congratulation"], ["㊋", "Circled ideograph secret"],
            ["㊌", "Circled ideograph male"], ["㊍", "Circled ideograph female"],
            ["㊎", "Circled ideograph suitable"], ["㊏", "Circled ideograph excellent"],
        ])),
    ]),
    category("ipa-phonetic", "IPA & Phonetic", "International Phonetic Alphabet characters", [
        group("Consonants", letters([
            ["ʃ", "Voiceless postalveolar fricative"], ["ʒ", "Voiced postalveolar fricative"],
            ["θ", "Voiceless dental fricative"], ["ð", "Voiced dental fricative"],
            ["ŋ", "Eng"], ["ʔ", "Glottal stop"], ["ʧ", "Voiceless postalveolar affricate"],
            ["ʤ", "Voiced postalveolar affricate"], ["ɲ", "Palatal nasal"], ["ɾ", "Alveolar tap"],
            ["ɹ", "Alveolar approximant"], ["ʁ", "Voiced uvular fricative"],
            ["χ", "Voiceless uvular fricative"], ["ħ", "Voiceless pharyngeal fricative"],
            ["ʕ", "Voiced pharyngeal fricative"], ["ɸ", "Voiceless bilabial fricative"],
            ["β", "Voiced bilabial fricative"], ["ç", "Voiceless palatal fricative"],
        ])),
        group("Vowels & diacritics", letters([
            ["ə", "Schwa"], ["ɪ", "Near-close near-front unrounded vowel"],
            ["ʊ", "Near-close near-back rounded vowel"], ["æ", "Near-open front unrounded vowel"],
            ["ɑ", "Open back unrounded vowel"], ["ɔ", "Open-mid back rounded vowel"],
            ["ʌ", "Open-mid back unrounded vowel"], ["ɒ", "Open back rounded vowel"],
            ["ɜ", "Open-mid central unrounded vowel"], ["ʉ", "Close central rounded vowel"],
            ["ɨ", "Close central unrounded vowel"], ["ʏ", "Near-close near-front rounded vowel"],
            ["ː", "Triangular colon"], ["ˑ", "Half triangular colon"],
            ["ˈ", "Primary stress"], ["ˌ", "Secondary stress"], ["ː", "Length mark"],
        ])),
    ]),
];

function dedupeSymbols(categoriesData) {
    const seen = new Set();
    let total = 0;

    for (const cat of categoriesData) {
        for (const grp of cat.groups) {
            grp.symbols = grp.symbols.filter((entry) => {
                const key = `${entry.char}\0${entry.name}`;
                if (seen.has(entry.char) && seen.has(`char:${entry.char}`)) {
                    return false;
                }
                seen.add(`char:${entry.char}`);
                seen.add(key);
                total += 1;
                return true;
            });
        }
        cat.groups = cat.groups.filter((grp) => grp.symbols.length > 0);
    }

    return { categories: categoriesData, total };
}

const { categories: cleaned, total } = dedupeSymbols(categories);

function serializeSymbol({ char, name }) {
    const escaped = char
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\u00a0/g, "\\u00a0");
    const escapedName = name.replace(/"/g, '\\"');
    return `            { char: "${escaped}", name: "${escapedName}" }`;
}

function serializeGroup(grp) {
    const symbols = grp.symbols.map(serializeSymbol).join(",\n");
    return `        {
            label: "${grp.label.replace(/"/g, '\\"')}",
            symbols: [
${symbols},
            ],
        }`;
}

function serializeCategory(cat) {
    const groups = cat.groups.map(serializeGroup).join(",\n");
    return `    {
        id: "${cat.id}",
        label: "${cat.label.replace(/"/g, '\\"')}",
        description: "${cat.description.replace(/"/g, '\\"')}",
        groups: [
${groups},
        ],
    }`;
}

const output = `export const SPECIAL_CHARACTER_CATEGORIES = [
${cleaned.map(serializeCategory).join(",\n")},
];

export function getSpecialCharacterSymbols(category) {
    return category.groups.flatMap((group) => group.symbols);
}

export function getAllSpecialCharacterSymbols(categories = SPECIAL_CHARACTER_CATEGORIES) {
    return categories.flatMap((category) => getSpecialCharacterSymbols(category));
}

export function getSpecialCharacterCount(categories = SPECIAL_CHARACTER_CATEGORIES) {
    return getAllSpecialCharacterSymbols(categories).length;
}
`;

writeFileSync(
    new URL("../src/modules/text/_shared/specialCharacterData.js", import.meta.url),
    output,
);

console.log(`Wrote ${cleaned.length} categories with ${total} unique characters.`);

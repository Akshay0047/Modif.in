import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeUrl } from "../../src/modules/text/_shared/webSecurityUtils.js";

test("URL sanitizer preserves functional queries, duplicates, hashes and exact paths", () => {
    const urls = [
        "https://example.com/dashboard?project=123&lang=fr#settings",
        "https://example.com/folder/",
        "https://example.com/?tag=a&tag=b&ref=account&source=docs&next=%2Fhome&filters%5Btype%5D=x#route/",
        "https://example.com/%7Euser/?signature=a%20b%2fc+Z&flag&empty=#anchor",
        "https://example.com/?",
        "https://example.com/#fragment?utm_source=keep",
        "https://youtube.com/watch?v=abc&list=one&list=two&custom=yes#t=10",
        "https://www.google.com/search?q=abc&custom=yes&start=20#section",
        "https://amazon.com/item/?variant=blue&cart=1#buy",
        "https://reddit.com/r/example/comments/123/?sort=top&context=3#reply",
        "https://x.com/search?q=example&f=live",
    ];
    for (const url of urls) assert.equal(sanitizeUrl(url), url);
});

test("URL sanitizer removes only recognized trackers without reserializing retained values", () => {
    assert.equal(
        sanitizeUrl("https://example.com/path/?utm_source=a&tag=a&fbclid=x&tag=b&UTM_CAMPAIGN=c&project=123#gclid=keep"),
        "https://example.com/path/?tag=a&tag=b&project=123#gclid=keep",
    );
    assert.equal(sanitizeUrl("https://example.com/?%75tm_source=x&sig=a%20b%2fc+Z&gclid=x"), "https://example.com/?sig=a%20b%2fc+Z");
    assert.equal(sanitizeUrl("https://example.com/folder/?gclid=x#settings"), "https://example.com/folder/#settings");
    assert.throws(() => sanitizeUrl("not a URL"), /Invalid URL/);
});

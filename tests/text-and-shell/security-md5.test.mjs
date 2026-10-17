import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { generateHash } from "../../src/modules/text/_shared/webSecurityUtils.js";

const vectors = [
    ["", "d41d8cd98f00b204e9800998ecf8427e"],
    ["a", "0cc175b9c0f1b6a831c399e269772661"],
    ["abc", "900150983cd24fb0d6963f7d28e17f72"],
    ["message digest", "f96b697d7cb7938d525a2f31aaf161d0"],
    ["abcdefghijklmnopqrstuvwxyz", "c3fcd3d76192e4007dfb496cca67e13b"],
    ["ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", "d174ab98d277d9f5a5611c2c9f419d9f"],
    ["1234567890".repeat(8), "57edf4a22be3c955ac49da2e2107b67a"],
];

test("MD5 matches all seven RFC 1321 reference vectors", async () => {
    for (const [input, expected] of vectors) {
        assert.equal(await generateHash(input, "MD5"), expected);
    }
});

test("MD5 matches OpenSSL for UTF-8, padding boundaries and multiple blocks", async () => {
    const samples = ["你好 🌍 café\u0301", ...[55, 56, 63, 64, 65, 119, 120, 128, 4096].map((n) => "x".repeat(n))];
    for (const input of samples) {
        assert.equal(await generateHash(input, "MD5"), createHash("md5").update(input, "utf8").digest("hex"));
    }
});

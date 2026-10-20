import assert from "node:assert/strict";
import test from "node:test";
import { acquireInert } from "../../src/utils/inertLock.js";

test("overlapping loader/dialog locks remain inert until both owners release, in either order", () => {
    for (const reverse of [false, true]) {
        const root = { inert: false };
        const releases = [acquireInert(root), acquireInert(root)];
        if (reverse) releases.reverse();
        releases[0]();
        releases[0]();
        assert.equal(root.inert, true);
        releases[1]();
        assert.equal(root.inert, false);
    }
});

test("locks preserve existing foreign inertness and explicitly adopt the initial HTML boot lock", () => {
    const foreign = { inert: true };
    acquireInert(foreign)();
    assert.equal(foreign.inert, true);
    const boot = { inert: true };
    acquireInert(boot, { initiallyInert: false })();
    assert.equal(boot.inert, false);
});

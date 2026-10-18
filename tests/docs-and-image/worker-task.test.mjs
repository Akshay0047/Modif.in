import assert from "node:assert/strict";
import test from "node:test";
import { createWorkerTaskRunner } from "../../src/modules/docs/_shared/workerTaskRunner.js";

class FakeWorker extends EventTarget {
    messages = [];
    terminated = false;
    postError = null;

    postMessage(message) {
        if (this.postError) throw this.postError;
        this.messages.push(message);
    }

    terminate() {
        this.terminated = true;
    }

    reply(index, message) {
        this.dispatchEvent(new MessageEvent("message", {
            data: { requestId: this.messages[index].requestId, ...message },
        }));
    }

    crash(message) {
        const event = new Event("error");
        event.message = message;
        this.dispatchEvent(event);
    }
}

function setup(t, options = {}) {
    const workers = [];
    const state = { running: [], progress: [], error: [] };
    const runner = createWorkerTaskRunner(() => {
        const worker = new FakeWorker();
        workers.push(worker);
        return worker;
    }, {
        onRunning: (value) => state.running.push(value),
        onProgress: (value) => state.progress.push(value),
        onError: (value) => state.error.push(value),
        ...options,
    });
    t.after(() => runner.dispose());
    return { runner, workers, state };
}

test("worker results match requests and running stays true until all requests finish", async (t) => {
    const { runner, workers, state } = setup(t);
    const one = runner.run({ task: "merge" });
    const two = runner.run({ task: "ocr" });
    workers[0].reply(1, { type: "progress", progress: 45 });
    workers[0].reply(1, { type: "done", result: "second" });
    assert.equal(await two, "second");
    assert.equal(state.running.at(-1), true);
    assert.equal(state.progress.at(-1), 45);
    workers[0].reply(0, { type: "done", result: "first" });
    assert.equal(await one, "first");
    assert.equal(state.running.at(-1), false);
});

test("unmount cancellation settles pending work, clears timeouts and rejects future runs", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const { runner, workers, state } = setup(t, { timeoutMs: 20 });
    const task = runner.run({ task: "compress" });
    const cancelled = assert.rejects(task, { name: "AbortError" });
    runner.dispose();
    await cancelled;
    const snapshot = structuredClone(state);
    t.mock.timers.tick(100);
    workers[0].crash("late error");
    workers[0].reply(0, { type: "done", result: "late data" });
    assert.deepEqual(state, snapshot);
    assert.equal(workers[0].terminated, true);
    await assert.rejects(runner.run({ task: "merge" }), { name: "AbortError" });
    assert.equal(workers.length, 1);
});

test("worker failure rejects all pending requests immediately and the next request restarts", async (t) => {
    const { runner, workers, state } = setup(t);
    const one = runner.run({ task: "ocr" });
    const two = runner.run({ task: "ocr" });
    const failures = Promise.all([
        assert.rejects(one, /bad image/),
        assert.rejects(two, /bad image/),
    ]);
    workers[0].reply(0, { type: "error", error: "bad image" });
    await failures;
    assert.equal(workers[0].terminated, true);
    assert.equal(state.running.at(-1), false);
    const retry = runner.run({ task: "merge" });
    workers[1].reply(0, { type: "done", result: new Uint8Array([1]) });
    assert.deepEqual(await retry, new Uint8Array([1]));
    assert.equal(state.error.at(-1), "");
});

test("timeout terminates the worker and settles every request instead of leaving queued work", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const { runner, workers } = setup(t, { timeoutMs: 20 });
    const one = runner.run({ task: "ocr" });
    t.mock.timers.tick(10);
    const two = runner.run({ task: "ocr" });
    const failures = Promise.all([
        assert.rejects(one, /timed out/),
        assert.rejects(two, /timed out/),
    ]);
    t.mock.timers.tick(10);
    await failures;
    assert.equal(workers[0].terminated, true);
});

test("startup errors, worker crashes, post errors and missing results remain retryable", async (t) => {
    let attempts = 0;
    const worker = new FakeWorker();
    const runner = createWorkerTaskRunner(() => {
        attempts += 1;
        if (attempts < 3) throw new Error("blocked worker");
        return worker;
    });
    t.after(() => runner.dispose());
    await assert.rejects(runner.run({ task: "merge" }), /blocked worker/);
    const retry = runner.run({ task: "merge" });
    const crashed = assert.rejects(retry, /worker crashed/);
    worker.crash("worker crashed");
    await crashed;
    worker.postError = new Error("clone failed");
    await assert.rejects(runner.run({ task: "merge" }), /clone failed/);
    worker.postError = null;
    const empty = runner.run({ task: "merge" });
    const rejected = assert.rejects(empty, /no result/);
    worker.reply(1, { type: "done" });
    await rejected;
});

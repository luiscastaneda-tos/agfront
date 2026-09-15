// Regression test for the fetchImplementation receiver-binding bug.
//
// Native `fetch` is a method that requires `window`/`globalThis` as its `this`
// receiver. HttpTransport stores it as `this.fetchImplementation = ... ?? globalThis.fetch`
// and later calls it as `this.fetchImplementation(...)`. If the reference isn't bound,
// that call passes the HttpTransport instance as the receiver, which real browsers
// reject with "Failed to execute 'fetch' on 'Window': Illegal invocation".
//
// Node's own global fetch does not enforce this receiver check, so it can't catch the
// regression on its own. This test installs a fetch mock that performs the same
// receiver check native fetch does, then exercises the exact call pattern
// HttpTransport uses internally (`this.fetchImplementation(...)`), reproducing the
// call's receiver from outside the class.
//
// No test framework dependency: uses `vite`'s programmatic SSR module loader (already
// a devDependency) to load the real TypeScript source, and Node's built-in `assert`.

import assert from "node:assert/strict";
import { createServer } from "vite";

async function main() {
  const server = await createServer({
    configFile: false,
    root: process.cwd(),
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });

  const originalFetch = globalThis.fetch;
  const calls = [];

  // Mimics native fetch's receiver brand-check.
  globalThis.fetch = function mockFetch(url, init) {
    if (this !== globalThis) {
      throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
    }
    calls.push({ url, init });
    return Promise.resolve(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  try {
    const mod = await server.ssrLoadModule("/src/infrastructure/api/HttpTransport.ts");
    const transport = new mod.HttpTransport({ baseUrl: "http://test.local" });

    // Reproduces the internal call site's receiver: inside the class this runs as
    // `this.fetchImplementation(...)`, which is exactly `transport.fetchImplementation(...)`
    // from the outside.
    await transport.fetchImplementation("http://test.local/probe");

    assert.equal(calls.length, 1, "expected exactly one fetch call");
    console.log(
      "[test-http-transport-fetch-binding] PASS - fetchImplementation preserves the " +
        "globalThis receiver.",
    );
  } finally {
    globalThis.fetch = originalFetch;
    await server.close();
  }
}

main().catch((error) => {
  console.error("[test-http-transport-fetch-binding] FAIL:", error.message);
  process.exitCode = 1;
});

import { describe, expect, it, vi } from "vitest";

import { isNetworkError, makeFetchWithRetry } from "@/server/network.server";

function networkError(code?: string) {
  return Object.assign(new TypeError("fetch failed"), code ? { cause: { code } } : {});
}

describe("makeFetchWithRetry", () => {
  it("retries a dropped read, then returns the response", async () => {
    const base = vi
      .fn()
      .mockRejectedValueOnce(networkError("ECONNRESET"))
      .mockRejectedValueOnce(networkError())
      .mockResolvedValue(new Response("ok"));
    const res = await makeFetchWithRetry(base as unknown as typeof fetch, [0, 0, 0])("https://x");
    expect(await res.text()).toBe("ok");
    expect(base).toHaveBeenCalledTimes(3);
  });

  it("retries repeatable writes (PATCH, DELETE)", async () => {
    for (const method of ["PATCH", "DELETE"]) {
      const base = vi
        .fn()
        .mockRejectedValueOnce(networkError())
        .mockResolvedValue(new Response("ok"));
      await makeFetchWithRetry(base as unknown as typeof fetch, [0])("https://x", { method });
      expect(base).toHaveBeenCalledTimes(2);
    }
  });

  it("never resends an insert that may have reached the server", async () => {
    const base = vi.fn().mockRejectedValue(networkError("ECONNRESET"));
    await expect(
      makeFetchWithRetry(base as unknown as typeof fetch, [0, 0])("https://x", { method: "POST" }),
    ).rejects.toThrow("fetch failed");
    expect(base).toHaveBeenCalledTimes(1);
  });

  it("resends an insert when the connection never opened", async () => {
    const base = vi
      .fn()
      .mockRejectedValueOnce(networkError("ENOTFOUND"))
      .mockResolvedValue(new Response("ok"));
    await makeFetchWithRetry(base as unknown as typeof fetch, [0])("https://x", { method: "POST" });
    expect(base).toHaveBeenCalledTimes(2);
  });

  it("gives up after the last delay and rethrows", async () => {
    const base = vi.fn().mockRejectedValue(networkError());
    await expect(
      makeFetchWithRetry(base as unknown as typeof fetch, [0, 0])("https://x"),
    ).rejects.toThrow();
    expect(base).toHaveBeenCalledTimes(3);
  });

  it("does not retry HTTP responses or aborts", async () => {
    const http = vi.fn().mockResolvedValue(new Response("nope", { status: 500 }));
    const res = await makeFetchWithRetry(http as unknown as typeof fetch, [0])("https://x");
    expect(res.status).toBe(500);
    expect(http).toHaveBeenCalledTimes(1);

    const abort = vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError"));
    await expect(
      makeFetchWithRetry(abort as unknown as typeof fetch, [0])("https://x"),
    ).rejects.toThrow();
    expect(abort).toHaveBeenCalledTimes(1);
  });
});

describe("isNetworkError", () => {
  it("recognises connection failures but not code bugs", () => {
    expect(isNetworkError(new TypeError("fetch failed"))).toBe(true);
    expect(isNetworkError(networkError("ENOTFOUND"))).toBe(true);
    expect(isNetworkError(new TypeError("Cannot read properties of undefined"))).toBe(false);
    expect(isNetworkError(new Error("Gemini returned malformed JSON."))).toBe(false);
  });
});

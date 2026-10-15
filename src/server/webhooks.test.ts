import { afterEach, describe, expect, it } from "vitest";

import { decodeHtml, grantToText, htmlToText, type GrantDetail } from "@/server/grants.server";
import { requireBearer, safeEqual } from "@/server/http.server";
import {
  findTranscriptFile,
  hmacSha256Hex,
  verifyZoomSignature,
  zoomUrlValidation,
} from "@/server/zoom.server";

describe("Zoom webhook security", () => {
  const secret = "zoom-secret-token";
  const body = JSON.stringify({ event: "recording.transcript_completed" });
  const now = 1_790_000_000_000;
  const timestamp = String(now / 1000);

  it("computes the documented HMAC for URL validation", async () => {
    const result = await zoomUrlValidation("plain-token", secret);
    expect(result.plainToken).toBe("plain-token");
    expect(result.encryptedToken).toBe(await hmacSha256Hex(secret, "plain-token"));
    expect(result.encryptedToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it("accepts a correctly signed, fresh request", async () => {
    const signature = `v0=${await hmacSha256Hex(secret, `v0:${timestamp}:${body}`)}`;
    await expect(
      verifyZoomSignature({ rawBody: body, timestamp, signature, secret, nowMs: now }),
    ).resolves.toBe(true);
  });

  it("rejects a tampered body, a wrong secret, or a stale timestamp", async () => {
    const signature = `v0=${await hmacSha256Hex(secret, `v0:${timestamp}:${body}`)}`;
    await expect(
      verifyZoomSignature({ rawBody: `${body} `, timestamp, signature, secret, nowMs: now }),
    ).resolves.toBe(false);
    await expect(
      verifyZoomSignature({ rawBody: body, timestamp, signature, secret: "other", nowMs: now }),
    ).resolves.toBe(false);
    await expect(
      verifyZoomSignature({
        rawBody: body,
        timestamp,
        signature,
        secret,
        nowMs: now + 10 * 60 * 1000,
      }),
    ).resolves.toBe(false);
    await expect(
      verifyZoomSignature({ rawBody: body, timestamp: null, signature, secret, nowMs: now }),
    ).resolves.toBe(false);
  });

  it("finds the transcript file among the recording files", () => {
    const file = findTranscriptFile({
      event: "recording.transcript_completed",
      payload: {
        object: {
          recording_files: [
            { file_type: "MP4", download_url: "https://zoom/video" },
            { file_type: "TRANSCRIPT", download_url: "https://zoom/vtt" },
          ],
        },
      },
    });
    expect(file?.download_url).toBe("https://zoom/vtt");
  });
});

describe("bearer secrets", () => {
  afterEach(() => {
    delete process.env["TEST_SECRET"];
  });

  it("compares strings exactly", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("is disabled until the secret is configured", () => {
    const res = requireBearer(new Request("https://x"), "TEST_SECRET");
    expect(res?.status).toBe(503);
  });

  it("rejects missing or wrong tokens and accepts the right one", () => {
    process.env["TEST_SECRET"] = "s3cret";
    const call = (auth?: string) =>
      requireBearer(
        new Request("https://x", auth ? { headers: { authorization: auth } } : {}),
        "TEST_SECRET",
      );
    expect(call()?.status).toBe(401);
    expect(call("Bearer nope")?.status).toBe(401);
    expect(call("Bearer s3cret")).toBeNull();
  });
});

describe("Grants.gov text cleanup", () => {
  it("decodes named and numeric entities", () => {
    expect(decodeHtml("ROSS &ndash; FY2026 &amp; beyond &#39;26")).toBe(
      "ROSS – FY2026 & beyond '26",
    );
  });

  it("turns HTML descriptions into readable text", () => {
    expect(htmlToText("<p>First&nbsp;para</p><ul><li>One</li><li>Two</li></ul>")).toBe(
      "First para\n• One\n• Two",
    );
  });

  it("builds the Intake text with the key facts first", () => {
    const detail: GrantDetail = {
      id: "1",
      number: "HUD-1",
      title: "Test NOFO",
      agency: "HUD",
      openDate: "",
      closeDate: "",
      status: "posted",
      listings: ["14.239"],
      description: "Funds rental housing.",
      estimatedFunding: "$5,000,000",
      awardCeiling: "$1,000,000",
      awardFloor: null,
      deadline: "Nov 10, 2026",
      eligibility: null,
      applicantTypes: ["Nonprofits"],
      contact: null,
      link: "https://www.grants.gov/search-results-detail/1",
    };
    const text = grantToText(detail);
    expect(text.split("\n")[0]).toBe("Grants.gov opportunity HUD-1 (open for applications)");
    expect(text).toContain("Award range: — to $1,000,000");
    expect(text).toContain("Application deadline: Nov 10, 2026");
    expect(text).toContain("Funds rental housing.");
  });
});

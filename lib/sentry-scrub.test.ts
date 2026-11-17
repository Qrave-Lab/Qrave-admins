import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error TS5097: node --test needs the explicit .ts extension
import { scrubEvent } from "./sentry-scrub.ts";

test("scrubEvent redacts headers, query tokens, bodies and PII", () => {
  const e = scrubEvent({
    message: "failed for a@b.com +91 98765 43210",
    request: {
      url: "https://x.test/pay?token=abc&table=3#h",
      query_string: "otp=123456&table=3",
      headers: { Authorization: "Bearer abc", Cookie: "a=b", Accept: "json" },
      cookies: { a: "b" },
      data: { pin: "1234" },
    },
    user: { id: "u1", email: "a@b.com", ip_address: "1.2.3.4" },
  });
  assert.equal(e.request.headers.Authorization, "[redacted]");
  assert.equal(e.request.headers.Cookie, "[redacted]");
  assert.equal(e.request.headers.Accept, "json");
  assert.ok(!e.request.query_string.includes("123456"));
  assert.ok(!e.request.url.includes("abc"));
  assert.ok(e.request.url.includes("table=3"));
  assert.equal(e.request.data, undefined);
  assert.deepEqual(e.user, { id: "u1" });
  assert.ok(!e.message.includes("a@b.com") && !e.message.includes("98765"));
});

import { beforeEach, describe, expect, it } from "vitest";
import { rateLimitInMemory as rateLimit, resetRateLimits } from "@/lib/rate-limit";

const options = { limit: 3, windowMs: 1000 };

beforeEach(() => resetRateLimits());

describe("rateLimit", () => {
  it("allows up to the limit within the window, then refuses", () => {
    expect(rateLimit("ip", { ...options, now: 0 })).toBe(true);
    expect(rateLimit("ip", { ...options, now: 10 })).toBe(true);
    expect(rateLimit("ip", { ...options, now: 20 })).toBe(true);
    expect(rateLimit("ip", { ...options, now: 30 })).toBe(false);
  });

  it("allows again once old attempts leave the window", () => {
    for (const now of [0, 10, 20]) rateLimit("ip", { ...options, now });
    expect(rateLimit("ip", { ...options, now: 999 })).toBe(false);
    expect(rateLimit("ip", { ...options, now: 1001 })).toBe(true);
  });

  it("counts each key separately", () => {
    for (const now of [0, 1, 2]) rateLimit("a", { ...options, now });
    expect(rateLimit("a", { ...options, now: 3 })).toBe(false);
    expect(rateLimit("b", { ...options, now: 3 })).toBe(true);
  });
});

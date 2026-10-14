import { beforeEach, describe, expect, it, vi } from "vitest";

// What the mocked MX lookup answers: records, or a node:dns error code.
const dns = vi.hoisted(() => ({
  answer: [] as { exchange: string; priority: number }[] | string,
  asked: [] as string[],
}));

vi.mock("node:dns/promises", () => ({
  Resolver: class {
    async resolveMx(domain: string) {
      dns.asked.push(domain);
      if (typeof dns.answer === "string") throw Object.assign(new Error(dns.answer), { code: dns.answer });
      return dns.answer;
    }
  },
}));

const { domainAcceptsMail } = await import("./email-domain");

beforeEach(() => {
  dns.answer = [];
  dns.asked = [];
});

describe("domainAcceptsMail", () => {
  it("accepts a domain with mail servers", async () => {
    dns.answer = [{ exchange: "mx.example.com", priority: 10 }];
    expect(await domainAcceptsMail("ana@Example.com")).toBe(true);
    expect(dns.asked).toEqual(["example.com"]);
  });

  it("refuses a domain that doesn't exist or has no mail servers", async () => {
    dns.answer = "ENOTFOUND";
    expect(await domainAcceptsMail("ana@gmial.con")).toBe(false);
    dns.answer = "ENODATA";
    expect(await domainAcceptsMail("ana@example.org")).toBe(false);
  });

  it("refuses a null MX (a domain that says it takes no mail)", async () => {
    dns.answer = [{ exchange: "", priority: 0 }];
    expect(await domainAcceptsMail("ana@example.com")).toBe(false);
  });

  it("lets the address through when DNS itself fails", async () => {
    dns.answer = "ETIMEOUT";
    expect(await domainAcceptsMail("ana@example.com")).toBe(true);
  });
});

import "server-only";
import { Resolver } from "node:dns/promises";

// Mail to an address whose domain can't receive mail bounces back to the
// studio's inbox. Checking the domain's MX records first stops typos
// (gmial.con) and made-up domains before anything is sent. It can't tell
// whether a mailbox exists at a real domain; the hourly cap in lib/mail.ts
// limits those.

const resolver = new Resolver({ timeout: 3000, tries: 2 });

/** False only when DNS says the domain takes no mail; lookup trouble lets it through. */
export async function domainAcceptsMail(email: string): Promise<boolean> {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  try {
    const records = await resolver.resolveMx(domain);
    // A "null MX" (one record with an empty exchange) means "no mail here".
    return records.some((record) => record.exchange !== "" && record.exchange !== ".");
  } catch (error) {
    const code = (error as { code?: string }).code;
    return code !== "ENOTFOUND" && code !== "ENODATA";
  }
}

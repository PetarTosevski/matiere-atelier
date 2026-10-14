import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { buildConfirmationEmail } from "@/lib/confirmation-email";
import type { Translate } from "@/lib/inquiry-email";
import messages from "../../messages/en.json";

const translator = createTranslator({ locale: "en", messages, namespace: "ConfirmationEmail" });
const t: Translate = (key, values) => translator(key as never, values as never);
const base = { origin: "https://www.example.com", locale: "en", siteName: "Matière Atelier" };

describe("buildConfirmationEmail", () => {
  it("thanks the visitor and links back to the site", () => {
    const email = buildConfirmationEmail({ ...base, type: "CONTACT", pieces: [] }, t);
    expect(email.subject).toBe("Your message to Matière Atelier");
    expect(email.text).toContain("We have received your message and will be in touch soon.");
    expect(email.text).toContain("https://www.example.com/en/originals");
    expect(email.text).toContain("entered on a form at www.example.com");
    expect(email.html).toContain('src="https://www.example.com/email/brush-stroke.png"');
    expect(email.html).toContain('alt=""');
  });

  it("names the piece asked about", () => {
    const email = buildConfirmationEmail(
      { ...base, type: "REQUEST", pieces: [{ title: "Low Tide", url: "https://www.example.com/en/originals/low-tide" }] },
      t,
    );
    expect(email.text).toContain("The piece:\n- Low Tide (https://www.example.com/en/originals/low-tide)");
  });

  it("escapes titles in the HTML", () => {
    const email = buildConfirmationEmail(
      { ...base, type: "REQUEST", pieces: [{ title: "Sea <b>& sky</b>", url: "https://www.example.com/x" }] },
      t,
    );
    expect(email.html).toContain("Sea &lt;b&gt;&amp; sky&lt;/b&gt;");
    expect(email.html).not.toContain("<b>");
  });
});

import type { InquiryInput } from "@/lib/inquiry";

// Builds the plain-text email the artist receives. Plain text on purpose:
// visitor input can't inject markup, and it reads well in any mail client.

export type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export type InquiryEmailInput =
  | { type: "CONTACT"; data: InquiryInput<"CONTACT"> }
  | { type: "COMMISSION"; data: InquiryInput<"COMMISSION"> }
  | {
      type: "REQUEST";
      data: InquiryInput<"REQUEST">;
      artwork: { title: string; url: string };
    }
  | {
      type: "ORDER";
      data: InquiryInput<"ORDER">;
      items: { title: string; url: string; price: string }[];
      totals: string[];
    };

/** Removes line breaks so visitor input can't add lines to the subject. */
const oneLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

export function buildInquiryEmail(
  input: InquiryEmailInput,
  t: Translate,
  /** The stored inquiry's number for its type; none without the database. */
  number?: number,
): { subject: string; text: string } {
  const name = oneLine(input.data.name);
  const field = (label: string, value: string) =>
    `${t(label)}: ${value.trim() || t("notGiven")}`;

  const lines: string[] = [
    t("intro", { type: input.type }),
    "",
    field("name", name),
    field("email", input.data.email),
  ];
  let title = "";

  switch (input.type) {
    case "CONTACT":
      lines.push("", `${t("message")}:`, input.data.message);
      break;
    case "COMMISSION":
      lines.push(
        field("size", input.data.size),
        field("budget", input.data.budget),
        "",
        `${t("description")}:`,
        input.data.description,
      );
      break;
    case "REQUEST":
      title = oneLine(input.artwork.title);
      lines.push(
        field("piece", `${input.artwork.title} (${input.artwork.url})`),
        "",
        `${t("message")}:`,
        input.data.message,
      );
      break;
    case "ORDER":
      lines.push(
        "",
        `${t("pieces")}:`,
        ...input.items.map(
          (item) => `- ${item.title}, ${item.price} (${item.url})`,
        ),
        field("total", input.totals.join(" + ")),
        "",
        `${t("message")}:`,
        input.data.message.trim() || t("notGiven"),
      );
      break;
  }

  lines.push("", t("replyHint", { name }));

  return {
    subject: oneLine(
      t("subject", {
        type: input.type,
        number: number === undefined ? "none" : String(number),
        name,
        title,
      }),
    ),
    text: lines.join("\n"),
  };
}

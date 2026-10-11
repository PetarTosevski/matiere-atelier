// Text edits behind the description toolbar, like GitHub's comment box.
// Pure functions: they take the text and selection and return the new text
// and the selection to restore, so they can be tested without a browser.

export type MarkdownFormat = "bold" | "italic" | "heading" | "bullet" | "number" | "quote" | "link";

export type Edit = { value: string; selectionStart: number; selectionEnd: number };

const INLINE: Partial<Record<MarkdownFormat, string>> = { bold: "**", italic: "*" };
const LINE_PREFIX: Partial<Record<MarkdownFormat, (index: number) => string>> = {
  heading: () => "## ",
  bullet: () => "- ",
  number: (index) => `${index + 1}. `,
  quote: () => "> ",
};

/**
 * Applies a format to `value` at the given selection. `placeholder` is used
 * when nothing is selected, and is left selected so typing replaces it.
 */
export function applyMarkdownFormat(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  format: MarkdownFormat,
  placeholder: string,
): Edit {
  const before = value.slice(0, selectionStart);
  const selected = value.slice(selectionStart, selectionEnd);
  const after = value.slice(selectionEnd);

  const marker = INLINE[format];
  if (marker) {
    const text = selected || placeholder;
    const start = selectionStart + marker.length;
    return {
      value: `${before}${marker}${text}${marker}${after}`,
      selectionStart: start,
      selectionEnd: start + text.length,
    };
  }

  if (format === "link") {
    const text = selected || placeholder;
    const url = "https://";
    const urlStart = selectionStart + text.length + 3;
    return {
      value: `${before}[${text}](${url})${after}`,
      selectionStart: urlStart,
      selectionEnd: urlStart + url.length,
    };
  }

  const prefix = LINE_PREFIX[format];
  if (!prefix) return { value, selectionStart, selectionEnd };

  // Work on whole lines: from the start of the first selected line.
  const lineStart = before.lastIndexOf("\n") + 1;
  const block = value.slice(lineStart, selectionEnd) || "";
  const lines = (block || placeholder).split("\n");
  const formatted = lines.map((line, index) => `${prefix(index)}${line}`).join("\n");
  const head = value.slice(0, lineStart);
  // A list or heading needs its own paragraph: add a blank line before it.
  const spacer = head && !head.endsWith("\n\n") ? (head.endsWith("\n") ? "\n" : "\n\n") : "";

  const start = head.length + spacer.length;
  return {
    value: `${head}${spacer}${formatted}${after}`,
    selectionStart: block ? start : start + prefix(0).length,
    selectionEnd: start + formatted.length,
  };
}

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

// Lists, like a word processor: Enter continues a list, Enter on an empty
// item ends it, Tab and Shift+Tab nest and un-nest an item. Each returns null
// when the key should do what it normally does.

type ListItem = {
  indent: number;
  /** "-", "*", "+" or a number with "." or ")". */
  marker: string;
  /** Characters before the item's text: indent, marker and spaces. */
  prefixLength: number;
};

const LIST_ITEM = /^( *)([-*+]|\d{1,9}[.)])( +)/;

function parseListItem(line: string): ListItem | null {
  const match = LIST_ITEM.exec(line);
  if (!match) return null;
  const [prefix, indent = "", marker = ""] = match;
  return { indent: indent.length, marker, prefixLength: prefix.length };
}

function lineAt(value: string, position: number): { start: number; end: number; text: string } {
  const start = position === 0 ? 0 : value.lastIndexOf("\n", position - 1) + 1;
  const newline = value.indexOf("\n", position);
  const end = newline === -1 ? value.length : newline;
  return { start, end, text: value.slice(start, end) };
}

function orderedNumber(marker: string): number | null {
  return /^\d/.test(marker) ? Number.parseInt(marker, 10) : null;
}

function nextMarker(marker: string): string {
  const number = orderedNumber(marker);
  return number === null ? marker : `${number + 1}${marker.slice(-1)}`;
}

/** The list items above `lineStart`, nearest first, up to the first line that is not part of a list. */
function itemsAbove(value: string, lineStart: number): ListItem[] {
  const items: ListItem[] = [];
  const lines = value.slice(0, lineStart).split("\n").slice(0, -1).reverse();
  for (const line of lines) {
    const item = parseListItem(line);
    if (item) items.push(item);
    else if (!/^\s*$/.test(line) && !/^ +\S/.test(line)) break;
  }
  return items;
}

/** Enter in a list item: start the next item, or end the list on an empty one. */
export function continueList(value: string, selectionStart: number, selectionEnd: number): Edit | null {
  if (selectionStart !== selectionEnd) return null;
  const line = lineAt(value, selectionStart);
  const item = parseListItem(line.text);
  if (!item || selectionStart - line.start < item.prefixLength) return null;

  if (line.text.slice(item.prefixLength).trim() === "") {
    // Empty nested item: step out one level. Empty top-level item: end the list.
    if (item.indent > 0) return indentListItem(value, selectionStart, selectionEnd, "out");
    const cleared = value.slice(0, line.start) + value.slice(line.end);
    return { value: cleared, selectionStart: line.start, selectionEnd: line.start };
  }

  const insert = `\n${" ".repeat(item.indent)}${nextMarker(item.marker)} `;
  const cursor = selectionStart + insert.length;
  // Text after the cursor moves into the new item, without its leading spaces.
  const rest = value.slice(selectionStart, line.end).replace(/^ +/, "");
  return {
    value: value.slice(0, selectionStart) + insert + rest + value.slice(line.end),
    selectionStart: cursor,
    selectionEnd: cursor,
  };
}

/**
 * Tab ("in") nests the selected list items under the item above; Shift+Tab
 * ("out") moves them back one level. Returns the text unchanged when the
 * item cannot move (the first item of a list has nothing to nest under).
 */
export function indentListItem(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  direction: "in" | "out",
): Edit | null {
  const first = lineAt(value, selectionStart);
  const item = parseListItem(first.text);
  if (!item) return null;
  const unchanged = { value, selectionStart, selectionEnd };
  const above = itemsAbove(value, first.start);

  let target: number;
  if (direction === "in") {
    // Nest under the previous item at the same level, at its text's column
    // (markdown needs the sub-item to line up with the parent's text).
    const parent = above.find((candidate) => candidate.indent <= item.indent);
    if (!parent || parent.indent < item.indent) return unchanged;
    target = parent.prefixLength;
  } else {
    if (item.indent === 0) return unchanged;
    target = above.find((candidate) => candidate.indent < item.indent)?.indent ?? 0;
  }
  const delta = target - item.indent;

  // A numbered item follows its new previous sibling, or starts again at 1.
  let marker = item.marker;
  const number = orderedNumber(item.marker);
  if (number !== null) {
    const sibling = above.find((candidate) => candidate.indent <= target);
    const siblingNumber = sibling && sibling.indent === target ? orderedNumber(sibling.marker) : null;
    marker = `${siblingNumber === null ? 1 : siblingNumber + 1}${item.marker.slice(-1)}`;
  }

  const last = lineAt(value, Math.max(selectionStart, selectionEnd - (selectionEnd > selectionStart ? 1 : 0)));
  const lines = value.slice(first.start, last.end).split("\n");
  const moved = lines.map((line, index) => {
    const text = index === 0 ? " ".repeat(item.indent) + marker + line.slice(item.indent + item.marker.length) : line;
    if (delta > 0) return text.trim() === "" ? text : " ".repeat(delta) + text;
    const leading = text.length - text.trimStart().length;
    return text.slice(Math.min(leading, -delta));
  });
  const block = moved.join("\n");
  const firstShift = delta + marker.length - item.marker.length;
  const totalShift = block.length - (last.end - first.start);
  return {
    value: value.slice(0, first.start) + block + value.slice(last.end),
    selectionStart: Math.max(first.start, selectionStart + firstShift),
    selectionEnd: Math.max(first.start, selectionEnd + (selectionEnd > selectionStart ? totalShift : firstShift)),
  };
}

import { describe, expect, it } from "vitest";
import { applyMarkdownFormat, continueList, indentListItem } from "@/lib/markdown-format";

const at = (value: string, start: number, end = start) => ({ value, start, end });
const apply = (input: ReturnType<typeof at>, format: Parameters<typeof applyMarkdownFormat>[3]) =>
  applyMarkdownFormat(input.value, input.start, input.end, format, "text");
const selected = (edit: ReturnType<typeof applyMarkdownFormat>) =>
  edit.value.slice(edit.selectionStart, edit.selectionEnd);

describe("applyMarkdownFormat", () => {
  it("wraps the selection in bold and keeps it selected", () => {
    const edit = apply(at("Size: 61 x 51 cm", 0, 5), "bold");
    expect(edit.value).toBe("**Size:** 61 x 51 cm");
    expect(selected(edit)).toBe("Size:");
  });

  it("inserts a selected placeholder when nothing is selected", () => {
    const edit = apply(at("Oil on ", 7), "italic");
    expect(edit.value).toBe("Oil on *text*");
    expect(selected(edit)).toBe("text");
  });

  it("builds a link and selects the URL to type over", () => {
    const edit = apply(at("See the studio", 8, 14), "link");
    expect(edit.value).toBe("See the [studio](https://)");
    expect(selected(edit)).toBe("https://");
  });

  it("turns each selected line into a bullet", () => {
    const value = "Signed\nReady to hang";
    const edit = apply(at(value, 0, value.length), "bullet");
    expect(edit.value).toBe("- Signed\n- Ready to hang");
  });

  it("numbers lines in order", () => {
    const value = "Sketch\nUnderpainting\nGlaze";
    const edit = apply(at(value, 0, value.length), "number");
    expect(edit.value).toBe("1. Sketch\n2. Underpainting\n3. Glaze");
  });

  it("formats the whole line even when the selection starts mid-line", () => {
    const edit = apply(at("About the piece", 6, 9), "heading");
    expect(edit.value).toBe("## About the piece");
  });

  it("puts a list in its own paragraph after existing text", () => {
    const edit = apply(at("Intro line.\nSigned", 12, 18), "bullet");
    expect(edit.value).toBe("Intro line.\n\n- Signed");
  });

  it("adds a placeholder line when used on an empty line", () => {
    const edit = apply(at("", 0), "quote");
    expect(edit.value).toBe("> text");
    expect(selected(edit)).toBe("text");
  });
});

describe("continueList", () => {
  const enter = (value: string, position = value.length) => continueList(value, position, position);

  it("starts the next bullet", () => {
    const edit = enter("- Signed");
    expect(edit?.value).toBe("- Signed\n- ");
    expect(edit?.selectionStart).toBe(11);
  });

  it("counts on in a numbered list and keeps nesting", () => {
    expect(enter("1. Sketch")?.value).toBe("1. Sketch\n2. ");
    expect(enter("- Oil\n  1. Linen")?.value).toBe("- Oil\n  1. Linen\n  2. ");
  });

  it("moves the text after the cursor into the new item", () => {
    expect(enter("- Oil linen", 5)?.value).toBe("- Oil\n- linen");
  });

  it("ends the list on an empty item", () => {
    const edit = enter("- Signed\n- ");
    expect(edit?.value).toBe("- Signed\n");
    expect(edit?.selectionStart).toBe(9);
  });

  it("steps out of a sub-list on an empty nested item", () => {
    expect(enter("- Oil\n  - Linen\n  - ")?.value).toBe("- Oil\n  - Linen\n- ");
  });

  it("does nothing special outside a list or inside the marker", () => {
    expect(enter("Signed")).toBeNull();
    expect(enter("- Signed", 1)).toBeNull();
    expect(continueList("- Signed", 2, 5)).toBeNull();
  });
});

describe("indentListItem", () => {
  const tab = (value: string, direction: "in" | "out" = "in", position = value.length) =>
    indentListItem(value, position, position, direction);

  it("nests a bullet under the one above, at its text's column", () => {
    const edit = tab("- Oil\n- Linen");
    expect(edit?.value).toBe("- Oil\n  - Linen");
    expect(edit?.selectionStart).toBe(15);
    expect(tab("1. Oil\n2. Linen")?.value).toBe("1. Oil\n   1. Linen");
  });

  it("follows an existing sub-item's numbering", () => {
    expect(tab("1. Oil\n   1. Linen\n2. Frame")?.value).toBe("1. Oil\n   1. Linen\n   2. Frame");
  });

  it("leaves the first item of a list alone", () => {
    expect(tab("Intro\n\n- Oil")?.value).toBe("Intro\n\n- Oil");
    expect(tab("- Oil\n  - Linen\n  - Frame", "in", 11)?.value).toBe("- Oil\n  - Linen\n  - Frame");
  });

  it("moves a nested item back out with Shift+Tab", () => {
    expect(tab("- Oil\n  - Linen", "out")?.value).toBe("- Oil\n- Linen");
    expect(tab("1. Oil\n   1. Linen", "out")?.value).toBe("1. Oil\n2. Linen");
    expect(tab("- Oil", "out")?.value).toBe("- Oil");
  });

  it("indents every selected item", () => {
    const value = "- Oil\n- Linen\n- Frame";
    expect(indentListItem(value, 6, value.length, "in")?.value).toBe("- Oil\n  - Linen\n  - Frame");
  });

  it("returns null outside a list, so Tab moves focus", () => {
    expect(tab("Signed")).toBeNull();
  });
});

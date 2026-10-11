import { describe, expect, it } from "vitest";
import { applyMarkdownFormat } from "@/lib/markdown-format";

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

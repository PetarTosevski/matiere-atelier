"use client";

import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { Markdown } from "@/components/Markdown";
import { applyMarkdownFormat, type MarkdownFormat } from "@/lib/markdown-format";

const TOOLBAR: { format: MarkdownFormat; icon: string; shortcut?: "b" | "i" | "k" }[] = [
  { format: "bold", icon: "B", shortcut: "b" },
  { format: "italic", icon: "I", shortcut: "i" },
  { format: "heading", icon: "H" },
  { format: "bullet", icon: "•" },
  { format: "number", icon: "1." },
  { format: "quote", icon: "”" },
  { format: "link", icon: "↗", shortcut: "k" },
];

const inputClass =
  "block w-full border border-ink/40 bg-field px-3 py-2.5 font-mono text-sm aria-[invalid=true]:border-2 aria-[invalid=true]:border-ink";

type Props = {
  id: string;
  name: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  rows?: number;
};

/**
 * A markdown textarea with a formatting toolbar (and Ctrl/Cmd+B, I, K) and a
 * live preview beside it. Used for artwork descriptions and the About bio.
 */
export function MarkdownField({ id, name, label, hint, value, onChange, placeholder, error, rows = 12 }: Props) {
  const t = useTranslations("Admin.form");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelection = useRef<[number, number] | null>(null);

  // After a toolbar edit, put the cursor back where the edit left it.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const selection = pendingSelection.current;
    if (!textarea || !selection) return;
    pendingSelection.current = null;
    textarea.focus();
    textarea.setSelectionRange(selection[0], selection[1]);
  }, [value]);

  function format(kind: MarkdownFormat) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const edit = applyMarkdownFormat(
      value,
      textarea.selectionStart,
      textarea.selectionEnd,
      kind,
      t("toolbar.placeholder"),
    );
    pendingSelection.current = [edit.selectionStart, edit.selectionEnd];
    onChange(edit.value);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
    const match = TOOLBAR.find((item) => item.shortcut === event.key.toLowerCase());
    if (!match) return;
    event.preventDefault();
    format(match.format);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <label htmlFor={id} className="block">{label}</label>
        <p id={`${id}-hint`} className="mt-1 text-sm text-muted">{hint}</p>
        <div
          role="toolbar"
          aria-label={t("toolbar.label")}
          aria-controls={id}
          className="mt-2 flex flex-wrap gap-1 border border-b-0 border-ink/40 bg-field p-1"
        >
          {TOOLBAR.map((item) => {
            const toolLabel = item.shortcut
              ? t(`toolbar.${item.format as "bold" | "italic" | "link"}Shortcut`)
              : t(`toolbar.${item.format}`);
            return (
              <button
                key={item.format}
                type="button"
                onClick={() => format(item.format)}
                aria-label={toolLabel}
                title={toolLabel}
                className={`min-h-9 min-w-9 px-2 hover:bg-line focus-visible:bg-line ${
                  item.format === "bold" ? "font-bold" : item.format === "italic" ? "italic" : ""
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
              </button>
            );
          })}
        </div>
        <textarea
          ref={textareaRef}
          id={id}
          name={name}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
          className={inputClass}
        />
        {error && <p id={`${id}-error`} className="mt-2 text-sm">{error}</p>}
      </div>
      <div>
        <p className="block">{t("preview")}</p>
        <div className="mt-2 min-h-40 border border-line p-4">
          {value.trim() ? (
            <Markdown className="prose-description">{value}</Markdown>
          ) : (
            <p className="text-muted">{t("previewEmpty")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

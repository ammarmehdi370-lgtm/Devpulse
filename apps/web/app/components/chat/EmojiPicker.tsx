"use client";

import React, { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import {
  emojiCategories,
  emojiSearchTerms,
  type EmojiCategory,
} from "./emojis";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onSelect,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<EmojiCategory>("Frequent");
  const emojis = useMemo(() => {
    const all = Object.values(emojiCategories).flat() as string[];
    const source = query.trim()
      ? [...new Set(all)]
      : emojiCategories[category];
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return source.filter(
      (emoji) =>
        !normalizedQuery ||
        `${emoji} ${emojiSearchTerms[emoji] ?? ""}`
          .toLocaleLowerCase()
          .includes(normalizedQuery),
    );
  }, [category, query]);

  return (
    <section
      role="dialog"
      aria-label="Choose a reaction"
      className="w-72 rounded-xl border border-ide-border-strong bg-ide-panel p-3 text-ide-text-strong shadow-[0_16px_40px_var(--ide-color-shadow-strong)]"
    >
      <div className="mb-2 flex items-center gap-2 rounded-lg border border-ide-border-control bg-ide-input-bg px-2.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-ide-muted" aria-hidden="true" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search emoji"
          aria-label="Search emoji"
          className="min-w-0 flex-1 bg-transparent py-2 text-xs text-ide-text-strong outline-none placeholder:text-ide-text-muted"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close emoji picker"
          title="Close"
          className="flex h-6 w-6 items-center justify-center rounded-md text-ide-text-soft hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div className="mb-2 flex gap-1 overflow-x-auto" role="tablist" aria-label="Emoji categories">
        {(Object.keys(emojiCategories) as EmojiCategory[]).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={category === item}
            onClick={() => {
              setCategory(item);
              setQuery("");
            }}
            className={`shrink-0 rounded-md px-2 py-1 text-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring ${
              category === item
                ? "bg-ide-surface-raised text-ide-text-strong"
                : "text-ide-text-soft hover:bg-ide-surface-hover"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="grid max-h-44 grid-cols-8 gap-1 overflow-y-auto" role="listbox" aria-label="Emoji">
        {emojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            type="button"
            role="option"
            aria-selected={false}
            aria-label={`Add ${emoji}`}
            title={emoji}
            onClick={() => onSelect(emoji)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
          >
            {emoji}
          </button>
        ))}
        {emojis.length === 0 && (
          <p className="col-span-8 py-5 text-center text-xs text-ide-text-soft">
            No emoji found
          </p>
        )}
      </div>
    </section>
  );
};

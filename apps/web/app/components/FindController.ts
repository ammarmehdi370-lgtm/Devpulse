export interface FindMatch {
  start: number;
  end: number;
  groups: string[];
}

export interface FindOptions {
  matchCase: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}

export interface FindResult {
  matches: FindMatch[];
  index: number;
  error: string | null;
}

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class FindController {
  private options: FindOptions = {
    matchCase: false,
    wholeWord: false,
    useRegex: false,
  };
  private matches: FindMatch[] = [];
  private index = -1;
  private query = "";
  private error: string | null = null;
  private history: string[] = [];
  private historyIndex = -1;
  private selection: { start: number; end: number } | null = null;
  private isOpen = false;

  open(
    selectedText = "",
    selection: { start: number; end: number } | null = null,
  ) {
    this.isOpen = true;
    this.selection = selection;
    if (selectedText) this.search("", selectedText);
  }

  setQuery(query: string) {
    this.query = query;
  }

  close() {
    this.isOpen = false;
    this.matches = [];
    this.index = -1;
    this.error = null;
    this.selection = null;
  }

  search(content: string, query = this.query, cursor = 0): FindResult {
    const changedQuery = query !== this.query;
    this.query = query;
    this.error = null;
    this.matches = [];

    if (!query) {
      this.index = -1;
      return this.result();
    }

    let source = this.options.useRegex ? query : escapeRegExp(query);
    if (this.options.wholeWord) {
      source = `(?<![\\p{L}\\p{N}_])(?:${source})(?![\\p{L}\\p{N}_])`;
    }

    try {
      const expression = new RegExp(
        source,
        `gsu${this.options.matchCase ? "" : "i"}`,
      );
      const start = this.selection?.start ?? 0;
      const end = this.selection?.end ?? content.length;
      let match: RegExpExecArray | null;
      while ((match = expression.exec(content)) !== null) {
        if (match.index >= start && match.index + match[0].length <= end) {
          if (match[0].length) {
            this.matches.push({
              start: match.index,
              end: match.index + match[0].length,
              groups: match.slice(1),
            });
          } else {
            expression.lastIndex += 1;
          }
        }
      }
    } catch {
      this.error = "Invalid regular expression.";
    }

    if (this.matches.length === 0) {
      this.index = -1;
    } else if (changedQuery || this.index < 0) {
      const cursorIndex = this.matches.findIndex(
        (match) => match.start >= cursor,
      );
      this.index = cursorIndex === -1 ? 0 : cursorIndex;
    } else {
      const currentStart = this.matches[this.index]?.start;
      const foundIndex = this.matches.findIndex(
        (match) => match.start === currentStart,
      );
      this.index = foundIndex === -1 ? 0 : foundIndex;
    }

    if (query && this.history[this.history.length - 1] !== query) {
      this.history.push(query);
      if (this.history.length > 50) this.history.shift();
    }
    this.historyIndex = this.history.length;
    return this.result();
  }

  next(): FindResult {
    if (this.matches.length) {
      this.index = (this.index + 1 + this.matches.length) % this.matches.length;
    }
    return this.result();
  }

  prev(): FindResult {
    if (this.matches.length) {
      this.index = (this.index - 1 + this.matches.length) % this.matches.length;
    }
    return this.result();
  }

  replace(content: string, replacement: string): string {
    const match = this.matches[this.index];
    if (!match) return content;
    const value = this.options.useRegex
      ? replacement.replace(
          /\$(\d+)/g,
          (_, group: string) => match.groups[Number(group) - 1] ?? "",
        )
      : replacement;
    const updated =
      content.slice(0, match.start) + value + content.slice(match.end);
    this.search(updated, this.query, match.start + value.length);
    return updated;
  }

  replaceAll(content: string, replacement: string): string {
    if (!this.matches.length) return content;
    let updated = content;
    for (const match of [...this.matches].reverse()) {
      const value = this.options.useRegex
        ? replacement.replace(
            /\$(\d+)/g,
            (_, group: string) => match.groups[Number(group) - 1] ?? "",
          )
        : replacement;
      updated =
        updated.slice(0, match.start) + value + updated.slice(match.end);
    }
    this.search(updated, this.query);
    return updated;
  }

  toggleCase() {
    this.options.matchCase = !this.options.matchCase;
  }

  toggleWord() {
    this.options.wholeWord = !this.options.wholeWord;
  }

  toggleRegex() {
    this.options.useRegex = !this.options.useRegex;
  }

  setSelection(selection: { start: number; end: number } | null) {
    this.selection = selection;
  }

  historyMove(direction: -1 | 1): string {
    if (!this.history.length) return this.query;
    this.historyIndex = Math.max(
      0,
      Math.min(this.history.length, this.historyIndex + direction),
    );
    return this.history[this.historyIndex] ?? "";
  }

  get currentOptions(): FindOptions {
    return { ...this.options };
  }

  get currentMatch(): FindMatch | null {
    return this.matches[this.index] ?? null;
  }

  get openState() {
    return this.isOpen;
  }

  private result(): FindResult {
    return {
      matches: this.matches,
      index: this.index,
      error: this.error,
    };
  }
}

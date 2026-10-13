"use client";

import React from "react";
import { SHORTCUTS, formatShortcut, type ShortcutGroup } from "../editor/shortcuts";
import { Kbd, Modal } from "./ide/Primitives";

const GROUPS: ShortcutGroup[] = [
  "General",
  "Editor",
  "Navigation",
  "View",
  "Terminal",
  "Theme",
];

export const ShortcutsDialog: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({
  open,
  onClose,
}) => open ? (
  <Modal title="Keyboard shortcuts" onClose={onClose}>
    <div className="ide-shortcuts-list max-h-[min(65vh,560px)] overflow-y-auto">
      {GROUPS.map((group) => {
        const shortcuts = SHORTCUTS.filter((shortcut) => shortcut.group === group);
        if (shortcuts.length === 0) return null;
        return (
          <section key={group} aria-label={`${group} shortcuts`}>
            <h3 className="px-1 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-ide-muted">
              {group}
            </h3>
            {shortcuts.map((shortcut) => (
              <div key={shortcut.id}>
                <span>{shortcut.label}</span>
                <Kbd>{formatShortcut(shortcut.keys)}</Kbd>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  </Modal>
) : null;

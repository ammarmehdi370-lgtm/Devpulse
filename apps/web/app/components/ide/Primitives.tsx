"use client";

import React from "react";
import { X } from "lucide-react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "quiet" | "outline";
};

export const Button: React.FC<ButtonProps> = ({
  className = "",
  variant = "quiet",
  ...props
}) => (
  <button
    {...props}
    className={`ide-button ide-button-${variant} ${className}`}
  />
);

export const IconButton: React.FC<
  ButtonProps & { label: string; shortcut?: string }
> = ({ label, shortcut, title, ...props }) => (
  <Button
    {...props}
    className={`ide-icon-button ${props.className || ""}`}
    title={title || [label, shortcut].filter(Boolean).join(" · ")}
    aria-label={label}
  />
);

export const Tooltip: React.FC<{
  label: string;
  shortcut?: string;
  children: React.ReactElement;
}> = ({ label, shortcut, children }) =>
  React.cloneElement(children, {
    title: [label, shortcut].filter(Boolean).join(" · "),
  });

export const Kbd: React.FC<React.HTMLAttributes<HTMLElement>> = ({
  className = "",
  ...props
}) => <kbd {...props} className={`ide-kbd ${className}`} />;

export const Badge: React.FC<
  React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "accent" }
> = ({ className = "", tone = "neutral", ...props }) => (
  <span {...props} className={`ide-badge ide-badge-${tone} ${className}`} />
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className = "",
  ...props
}) => <input {...props} className={`ide-input ${className}`} />;

export const Panel: React.FC<React.HTMLAttributes<HTMLElement>> = ({
  className = "",
  ...props
}) => <section {...props} className={`ide-panel ${className}`} />;

export const Tabs: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  ...props
}) => <div {...props} className={`ide-tabs ${className}`} />;

export const Resizer: React.FC<
  React.HTMLAttributes<HTMLDivElement> & {
    label: string;
    orientation: "horizontal" | "vertical";
    value: number;
    min: number;
    max: number;
  }
> = ({ label, orientation, value, min, max, className = "", ...props }) => (
  <div
    {...props}
    role="separator"
    tabIndex={0}
    aria-label={label}
    aria-orientation={orientation}
    aria-valuenow={value}
    aria-valuemin={min}
    aria-valuemax={max}
    className={`ide-resizer ide-resizer-${orientation} ${className}`}
  />
);

export const Modal: React.FC<
  React.HTMLAttributes<HTMLDivElement> & {
    title: string;
    onClose: () => void;
  }
> = ({ title, onClose, className = "", children, ...props }) => (
  <div className="ide-modal-backdrop" onMouseDown={onClose}>
    <section
      {...props}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`ide-modal ${className}`}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <header className="ide-modal-header">
        <h2>{title}</h2>
        <IconButton label={`Close ${title}`} onClick={onClose}>
          <X aria-hidden="true" />
        </IconButton>
      </header>
      {children}
    </section>
  </div>
);

export const Dropdown = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { label: string }
>(({ label, className = "", ...props }, ref) => (
  <div
    {...props}
    ref={ref}
    aria-label={label}
    className={`ide-dropdown ${className}`}
  />
));
Dropdown.displayName = "Dropdown";

export const Switch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    className={`ide-switch ${checked ? "is-on" : ""}`}
    onClick={() => onChange(!checked)}
  >
    <span />
  </button>
);

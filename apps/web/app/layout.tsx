import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import "@xterm/xterm/css/xterm.css";
import {
  BUILT_IN_THEME_IDS,
  DEFAULT_THEME,
  DEFAULT_THEME_SYNTAX,
  DEFAULT_THEME_TERMINAL,
  DEFAULT_THEME_UI,
} from "./context/themeModel";

const themeBootstrapScript = `(()=>{try{
  const root=document.documentElement;
  const base=${JSON.stringify(DEFAULT_THEME_UI)};
  const fallback=${JSON.stringify(DEFAULT_THEME)};
  const presetIds=${JSON.stringify(BUILT_IN_THEME_IDS)};
  let imported=[];
  const importedValue=localStorage.getItem("devpulse_imported_themes");
  if(importedValue){try{const parsed=JSON.parse(importedValue);if(Array.isArray(parsed))imported=parsed.filter((item)=>item&&typeof item.id==="string")}catch(error){console.error("Unable to read imported themes before hydration.",error)}}
  let stored=null;
  const storedValue=localStorage.getItem("devpulse_theme");
  if(storedValue){try{const parsed=JSON.parse(storedValue);const accepted=parsed&&typeof parsed.id==="string"&&(presetIds.includes(parsed.id)||imported.some((item)=>item.id===parsed.id));if(accepted&&parsed.ui&&parsed.syntax&&parsed.terminal)stored=parsed}catch(error){console.error("Unable to read the saved theme before hydration.",error)}}
  const theme=stored||fallback;
  const ui={...base,...(theme&&typeof theme.ui==="object"?theme.ui:{})};
  const syntax={...${JSON.stringify(DEFAULT_THEME_SYNTAX)},...(theme&&typeof theme.syntax==="object"?theme.syntax:{})};
  const terminal={...${JSON.stringify(DEFAULT_THEME_TERMINAL)},...(theme&&typeof theme.terminal==="object"?theme.terminal:{}),ansi:{...${JSON.stringify(DEFAULT_THEME_TERMINAL.ansi)},...(theme&&theme.terminal&&theme.terminal.ansi||{})}};
  if(typeof theme.primary==="string")ui.accent=theme.primary;
  if(typeof theme.secondary==="string")ui.secondary=theme.secondary;
  if(typeof theme.tertiary==="string")ui.tertiary=theme.tertiary;
  const themeType=theme.type==="light"?"light":theme.type==="hc"?"hc":"dark";
  const mode=themeType==="light"?"light":"dark";
  root.setAttribute("data-theme-mode",mode);
  root.setAttribute("data-theme-type",themeType);
  root.classList.toggle("dark",mode==="dark");
  root.style.colorScheme=mode;
  Object.entries(ui).forEach(([key,value])=>root.style.setProperty("--ide-color-"+key,value));
  Object.entries(syntax).forEach(([key,value])=>root.style.setProperty("--ide-syntax-"+key,value));
  Object.entries(terminal.ansi).forEach(([key,value])=>root.style.setProperty("--ide-terminal-ansi-"+key,value));
  root.style.setProperty("--ide-terminal-fg",terminal.fg);
  root.style.setProperty("--ide-terminal-bg",terminal.bg);
  root.style.setProperty("--ide-terminal-cursor",terminal.cursor);
  root.style.setProperty("--ide-terminal-selection",terminal.selection);
  root.style.setProperty("--ide-color-accent-secondary",ui.secondary);
  const legacy={primary:ui.accent,"primary-hover":ui["accent-hover"],"primary-glow":ui["accent-soft"],secondary:ui.secondary,"secondary-glow":"color-mix(in srgb, "+ui.secondary+" 20%, transparent)",tertiary:ui.tertiary,"tertiary-glow":"color-mix(in srgb, "+ui.tertiary+" 20%, transparent)","neutral-dark":ui.bg,"neutral-panel":ui.panel,"neutral-surface":ui.surface,"neutral-border":ui["border-strong"],"app-bg":ui.bg};
  Object.entries(legacy).forEach(([key,value])=>root.style.setProperty("--"+key,value));
  const font=typeof theme.font==="string"?theme.font:"Inter";
  const fontStack=font==="Space Grotesk"?'"Space Grotesk", sans-serif':font==="JetBrains Mono"?'"JetBrains Mono", monospace":'"Inter", sans-serif';
  root.style.setProperty("--font-family-base",fontStack);
  root.style.setProperty("--font-family-mono",'"JetBrains Mono", monospace');
  root.style.setProperty("--ide-font-ui",fontStack);
  root.style.setProperty("--radius","8px");
  if(document.body)document.body.setAttribute("data-theme",theme.id);
}catch(error){console.error("Unable to apply the saved theme before hydration.",error)}})();`;

export const metadata: Metadata = {
  title: "Devpulse - Cloud Devbox & Ephemeral Development Platform",
  description:
    "Build at the speed of thought. Isolated containerized environments, zero-latency clusters, and neural coding agents.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="min-h-screen bg-ide-bg text-ide-text-high"
        suppressHydrationWarning
      >
        <Script
          id="devpulse-theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
        {children}
      </body>
    </html>
  );
}

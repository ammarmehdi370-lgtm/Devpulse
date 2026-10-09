# PROJECT_MAP

## 1. OVERVIEW

- Web framework: Next.js `14.2.21` (App Router, client-rendered SPA in `apps/web/app/page.tsx`); React/React DOM `18.3.1`.
- Styling/build: Tailwind CSS `^3.4.17`, PostCSS, Next.js build; pnpm workspace `9.15.0`, Turbo `^2.3.3`.
- Editor: `@monaco-editor/react ^4.6.0`; Monaco loader points at Monaco Editor `0.56.0` CDN. Terminal: `@xterm/xterm ^6.0.0`.
- Monorepo (`pnpm-workspace.yaml`): `apps/*`, `packages/*`.
- Apps: `apps/web` (`@devpulse/web`, main web client), `apps/api`, `apps/ai`, `apps/socket`, `apps/mobile`.
- Packages: `packages/config`, `packages/database`, `packages/types`, `packages/ui`, `packages/utils`.
- App shared layers: `apps/web/app/components`, `context`, `editor`, `services`, `styles`.

## 2. NAVIGATION

There are no per-screen Next routes. `PageType` and `setPage()` in `apps/web/app/context/AppContext.tsx` choose the current screen; `apps/web/app/page.tsx` renders it. `devpulse_active_page` restores the selection. Sidebars, command palette actions, and screen CTAs call `setPage`.

| Page id | UI name | Component | Reach | Approx. lines |
| --- | --- | --- | --- | ---: |
| `login` | Welcome back / Sign in | `apps/web/app/components/LoginPage.tsx` | Logged-out session / Sign out | 442 |
| `theme` | Choose Your App Look / Theme Library | `apps/web/app/components/ThemePalettePage.tsx` | Login flow; Settings & Theme menu; top-bar palette button; command palette | 1,033 |
| `repositories` | Code Projects | `apps/web/app/components/RepositoriesPage.tsx` | Platform sidebar “Your Code Projects”; top bar “Projects”; workbench Source Control; command palette; workspace CTA | 539 |
| `workspaces` | Cloud Workspaces | `apps/web/app/components/WorkspacesPage.tsx` | Platform sidebar “Your Workspaces”; top bar “Workspaces”; command palette; return/continue CTAs | 773 |
| `activity` | Your Activity | `apps/web/app/components/ActivityPage.tsx` | Platform sidebar | 1,009 |
| `deployments` | Live Releases & Health | `apps/web/app/components/DeploymentsPage.tsx` | Platform sidebar “Live Releases”; top bar “Releases”; workbench Deployments; command palette; project CTA | 903 |
| `chat` | Team chat | `apps/web/app/components/TeamChatPage.tsx` | Platform sidebar “Team Chat”; command palette; Pulse Pilot chat CTA | 631 |
| `editor` | Maestro Code Studio / Code Editor | `apps/web/app/components/EditorWorkbench.tsx` | Platform sidebar; top bar; workbench; command palette; project/workspace/AI actions | 4,309 |
| `remote-control` | Pulse Pilot | `apps/web/app/components/RemoteControlPage.tsx` | Platform sidebar; command palette | 467 |
| `ai-studio` | AI Assistant | `apps/web/app/components/FullScreenAiPage.tsx` | Platform sidebar; top bar “AI”; command palette | 684 |
| `pricing` | Plans & Billing | `apps/web/app/components/PricingPage.tsx` | Platform sidebar; command palette | 464 |
| `custom-plan` | Build your own plan | `apps/web/app/components/CustomPlanPage.tsx` | Pricing CTA | 345 |
| `cloud-core` | Cloud Core Engine | `apps/web/app/components/CloudCoreDashboard.tsx` | Platform sidebar | 1,215 |
| `api-sandbox` | API Sandbox | `apps/web/app/components/ApiSandboxPage.tsx` | Workbench API Sandbox; command palette; default page fallback | 1,962 |
| `settings` | Site settings | `apps/web/app/components/SiteSettingsPage.tsx` | Settings & Theme menu; command palette; payment page | 727 |
| `payment-methods` | Payment methods | `apps/web/app/components/PaymentMethodsPage.tsx` | Pricing CTA; Settings billing section | 278 |

Additional screens and overlays:

| Screen / overlay | Component / path | Reach | Approx. lines |
| --- | --- | --- | ---: |
| Hydration/loading screen and error boundary | `apps/web/app/page.tsx` | Initial loading / render failure | 139 |
| Quick tour (three-step onboarding region) | `apps/web/app/components/OnboardingTour.tsx` | Automatically in `AppShell` when tour is active; dismissed/completed via tour actions | 112 |
| Command palette dialog | `apps/web/app/components/CommandPalette.tsx` | Top-bar Search (`Ctrl/Cmd+K`); editor shortcut | 446 |
| Mobile navigation overlay | `apps/web/app/components/AppShell.tsx` | Mobile menu button | 955 |
| Settings & Theme shortcut menu | `apps/web/app/components/AppShell.tsx` | Sidebar/mobile “Settings & Theme” control | 955 |
| Account menu popover | `apps/web/app/components/AppShell.tsx` | Account button | 955 |
| Alert / confirm dialog host | `apps/web/app/components/FriendlyHelpers.tsx` | `friendlyAlert()` / `friendlyConfirm()` events | 161 |
| New repository dialog | `apps/web/app/components/RepositoriesPage.tsx` | Add repository action | 539 |
| Activity detail dialog | `apps/web/app/components/ActivityPage.tsx` | Select activity event | 1,009 |
| API snapshot drawer and record-detail dialog | `apps/web/app/components/ApiSandboxPage.tsx` | Snapshot controls / select record | 1,962 |
| Cloud Core allocation dialog | `apps/web/app/components/CloudCoreDashboard.tsx` | Allocation action | 1,215 |
| Channel details panel | `apps/web/app/components/TeamChatPage.tsx` | Channel details button | 631 |
| AI model dropdown | `apps/web/app/components/FullScreenAiPage.tsx` | Model selector | 684 |
| Editor Quick Open, breadcrumb menu, file search/replace, language menus, tab menu | `apps/web/app/components/EditorWorkbench.tsx` | Editor toolbar, keyboard shortcuts, tab context menu, status bar | 4,309 |
| Editor AI Assistant drawer | `apps/web/app/components/EditorWorkbench.tsx` | AI Assistant toolbar button | 4,309 |
| Editor settings / shortcuts / notifications dialogs | `apps/web/app/components/EditorWorkbench.tsx` | Status/toolbar buttons; `Ctrl/Cmd+,`; `?` | 4,309 |
| Editor unsaved-close and changes dialogs | `apps/web/app/components/EditorWorkbench.tsx` | Close project with dirty files / changes action | 4,309 |
| Site settings data-removal confirmation | `apps/web/app/components/SiteSettingsPage.tsx` | Account & data removal controls | 727 |
| Toast notifications | `apps/web/app/components/ToastContainer.tsx` | AppContext toast events, auto-dismiss | 57 |

## 3. SHELL AND LAYOUT

| Element | Path | Renders |
| --- | --- | --- |
| Root layout and theme bootstrap | `apps/web/app/layout.tsx` | HTML/body, metadata, global CSS, xterm CSS, before-interactive theme bootstrap |
| SPA entry and error boundary | `apps/web/app/page.tsx` | `AppProvider`, hydration gate, page selection, dynamic Editor/AI/remote imports, command palette and modal hosts |
| App shell | `apps/web/app/components/AppShell.tsx` | Floating top bar, responsive primary navigation, platform/workbench sidebars, account/settings menus, content shell, onboarding, toasts |
| Page heading | `apps/web/app/components/PageHeader.tsx` | Shared breadcrumb/title/subtitle/status header |
| Command palette | `apps/web/app/components/CommandPalette.tsx` | Fuzzy search over navigation, actions, files, and built-in/imported themes |
| Toast surface | `apps/web/app/components/ToastContainer.tsx` | Fixed-stack status notifications |
| Onboarding | `apps/web/app/components/OnboardingTour.tsx` | Inline welcome tour |
| Modal host/helpers | `apps/web/app/components/FriendlyHelpers.tsx` | Event-driven alert/confirm dialog, `HelpfulInfo`, `FriendlyHint` |
| Skeletons | `apps/web/app/components/SkeletonLoaders.tsx` | Loading placeholders |
| Global CSS and tokens | `apps/web/app/globals.css`, `apps/web/app/styles/design-tokens.css` | Global/base styles, semantic token defaults, light-mode overrides, component styles |

## 4. STATE

`AppContextType` exported through `useApp()` (`apps/web/app/context/AppContext.tsx`), fields/functions by name:

```text
page, setPage, isClientStorageHydrated, user, login, logout,
theme, setTheme, importedThemes, addImportedTheme, deleteImportedTheme,
colorMode, setColorMode, matchSystemTheme, setMatchSystemTheme, previewTheme,
commandPaletteQuery, setCommandPaletteQuery, availableThemes,
repositories, searchRepoQuery, setSearchRepoQuery, repoFilter, setRepoFilter,
addRepository, deleteRepository, toggleStarRepo,
workspaces, spinUpDevbox, toggleWorkspaceStatus, deleteWorkspace,
deployments, activityEvents, addActivityEvent, isDataLoading,
triggerNewRelease, rerunPipeline, envVars, addEnvVar, deleteEnvVar,
toggleRevealEnvVar, revealAllEnvVars, toggleRevealAllEnvVars,
deployOnPush, setDeployOnPush, ephemeralPr, setEphemeralPr,
logs, clearLogs, addLog, isCommandPaletteOpen, setIsCommandPaletteOpen,
isEditorProjectOpen, setIsEditorProjectOpen, closeEditorProject,
editorProjectId, isEditorLoading, editorError, loadEditorProject,
loadedProjectName, setLoadedProjectName, treeFiles, treeFolders, createNewFolder,
openFiles, activeFileId, setActiveFileId, updateEditorFileLanguage,
fileContents, savedFileContents, updateFileContent, saveFileContent,
openFileInEditor, closeFileFromEditor, reorderOpenFiles,
closeOtherFilesFromEditor, closeAllFilesFromEditor, renameEditorFile,
createNewFile, deleteFile, loadUserLocalFiles, loadSingleLocalFile,
isFileTreeOpen, setIsFileTreeOpen, isAiDrawerOpen, setIsAiDrawerOpen,
isTerminalOpen, setIsTerminalOpen, isTerminalFocused, setIsTerminalFocused,
applyDiffToActiveFile, remoteCode, updateRemoteCode, isRemoteControlling,
setIsRemoteControlling, isRemoteMuted, setIsRemoteMuted, isRemoteCameraOn,
setIsRemoteCameraOn, billingCycle, setBillingCycle, toasts, addToast,
removeToast, isTourActive, tourStep, nextTourStep, prevTourStep, dismissTour
```

Local storage / browser persistence:

| Key | Stored value |
| --- | --- |
| `devpulse_workspaces` | Workspace/devbox list |
| `devpulse_activity_events` | Activity event list |
| `devpulse_editor_session` | Editor project, files, tabs, active file, file contents |
| `devpulse_active_page` | Current `PageType` |
| `devpulse_user_session` | User profile |
| `devpulse_logged_out` | Logged-out marker |
| `devpulse_theme` | Selected theme object |
| `devpulse_imported_themes` | Imported VS Code themes |
| `devpulse_theme_selected` | Theme selection/onboarding marker |
| `devpulse_color_mode` | `dark` or `light` |
| `devpulse_match_system_theme` | System color-mode preference |
| `devpulse_tour_done` | Onboarding completion |
| `devpulse_theme_favorites` | Theme IDs |
| `devpulse_recent_themes` | Recently selected theme IDs |
| `devpulse_ui_preferences` | Density and reduced-motion preferences |
| `devpulse_billing_method` | Selected billing method |
| `devpulse_activity_timer` | Activity timer state |
| `devpulse-editor-panels` | Editor panel visibility |
| `devpulse-ide-layout` | Editor pane layout |
| `devpulse-editor-hint-dismissed` | Editor hint dismissal |
| `devpulse-workbench-sidebar-open` | Workbench sidebar visibility |
| `devpulse-terminal-layout` | Terminal layout |

IndexedDB database `devpulse-editor-handles`, object store `handles`: native directory/file system handles. Browser session storage is cleared with app data for keys prefixed `devpulse_`.

## 5. THEME SYSTEM

- Model and default tokens: `apps/web/app/context/themeModel.ts`.
- Preset registry: `THEME_PRESETS`; library definitions/lazy loader: `apps/web/app/context/themeLibrary.ts`; import conversion: `apps/web/app/editor/vscodeThemeConverter.ts`.
- Notice/source/license list: `apps/web/THEMES_NOTICE.md`.
- Shape: legacy fields `id`, `name`, `primary`, `secondary`, `tertiary`, `neutral`, `font`, `mode`, `roundness`; plus `group`, `type`, `ui`, `syntax`, `terminal`, optional `monaco`.
- `ThemeType`: `dark | light | hc`; groups: `Default | Dark | Light | Custom`.
- Current built-ins (12): Cyber Mint, One Dark Pro, Dracula, GitHub Dark, GitHub Light, Material Palenight, Night Owl, Monokai, Tokyo Night, Ayu Mirage, Ayu Light, Cobalt2. Cyber Mint is preset ID `default`.
- UI semantic tokens (`ThemeUiTokens`):

```text
bg, panel, surface, elevated, border, border-strong, border-subtle, modal-border,
text, text-strong, text-high, body-text, text-secondary, text-body, text-soft,
text-dim, muted, subtle, accent, accent-hover, accent-fg, accent-soft,
surface-overlay, dropdown-bg, shell-bg, topbar-bg, sidebar-surface,
app-content-bg, workbench-bg, welcome-action-bg, welcome-secondary-bg-start,
welcome-secondary-bg-end, sidebar-footer-bg, terminal-border,
editor-line-highlight, surface-raised, surface-hover, surface-hover-strong,
skeleton-mid, skeleton-strong, secondary, tertiary, warm-accent, danger, warning,
success, info, hover, active, selection, focus-ring, scrollbar, scrollbar-hover,
overlay, shadow-color, shadow-active, shadow-shortcut, shadow-panel,
shadow-account, shadow-card, shadow-card-hover, shadow-strong, input-bg,
input-border, tab-active, tab-inactive, statusbar-bg, statusbar-fg, sidebar-bg,
editor-bg, gutter-fg, surface-card, surface-card-alt, surface-toolbar,
surface-control, surface-control-hover, surface-empty, surface-danger,
border-control, border-danger, text-tertiary, text-quiet, text-faint,
text-placeholder, text-danger-soft, login-bg, login-panel, login-aside,
login-code-bg, login-border, login-input-bg, login-input-border, login-muted,
login-code-muted, login-code-keyword, login-code-string, login-code-number,
login-border-soft, login-border-strong, login-text-subtle,
login-text-secondary, login-code-comment, login-code-line, login-code-function,
login-code-return, login-code-foreground, login-divider, login-accent-hover,
login-error, repository-toolbar, repository-border, repository-focus,
workspace-diagram-bg, workspace-surface, workspace-border,
workspace-border-inner
```

- Syntax tokens: `background`, `foreground`, `comment`, `keyword`, `string`, `number`, `cursor`, `selection`.
- Terminal tokens: `ansi` (`black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `brightBlack`, `brightRed`, `brightGreen`, `brightYellow`, `brightBlue`, `brightMagenta`, `brightCyan`, `brightWhite`), `fg`, `bg`, `cursor`, `selection`.
- Apply path: `setTheme()` resolves `resolveThemeModel()` and `applyThemeToDocument()` in `AppContext.tsx`; sets `data-theme-mode`, `data-theme-type`, body `data-theme`, color scheme, `--ide-color-*`, `--ide-syntax-*`, `--ide-terminal-ansi-*`, and terminal fg/bg/cursor/selection CSS variables.
- First paint: `apps/web/app/layout.tsx` bootstrap reads `devpulse_theme`, imported IDs, and `devpulse_color_mode`; accepts only listed preset IDs or imported theme IDs.
- Save/restore: `setTheme()` serializes to `devpulse_theme`; `getStoredTheme()` restores presets/imports and defaults to Cyber Mint for unknown/removed IDs. `setColorMode()` saves mode; `setMatchSystemTheme()` saves system preference. Favorites/recent IDs are normalized in `ThemePalettePage.tsx`.
- Monaco: `apps/web/app/components/EditorWorkbench.tsx` creates `devpulse-${theme.id}` using `getMonacoThemeData()`, registers via `monaco.editor.defineTheme()`, then calls `setTheme()`. Imported Monaco data comes from `vscodeThemeConverter.ts`.
- Terminal: `apps/web/app/components/TerminalPanel.tsx` maps `ThemeTerminalTokens` to xterm options; receives current theme from `EditorWorkbench.tsx`.

## 6. THEME PICKER AND SETTINGS

| Surface | Path | Behavior |
| --- | --- | --- |
| Theme palette page | `apps/web/app/components/ThemePalettePage.tsx` | Choose built-ins/imports; search, groups, favorites/recent; primary/secondary/tertiary color inputs; dark/light switch; imports VS Code `.json` |
| Settings quick theme switcher | `apps/web/app/components/SiteSettingsPage.tsx` | Native `<select>` across default, library, imported themes |
| Command palette | `apps/web/app/components/CommandPalette.tsx` | Theme commands in Theme category; preview while moving selection |
| Settings & Theme menu | `apps/web/app/components/AppShell.tsx` | Popover links to Site settings and Theme palette |
| Top bar palette icon | `apps/web/app/components/AppShell.tsx` | Opens command palette with `theme` query |
| Login mode button | `apps/web/app/components/LoginPage.tsx` | Toggles dark/light color mode |
| Appearance settings | `apps/web/app/components/SiteSettingsPage.tsx` | Dark/light segmented controls and match-system switch |
| Status bar | `apps/web/app/components/EditorWorkbench.tsx` | Language, encoding, branch, notifications, editor settings; no theme selector |

Other native `<select>` controls: editor font and tab size (`EditorWorkbench.tsx`); activity category/project/date filters (`ActivityPage.tsx`); API scenario, latency, request method (`ApiSandboxPage.tsx`); repository language (`RepositoriesPage.tsx`). Theme swatches use native `<input type="color">` in `ThemePalettePage.tsx`.

## 7. COLOR AUDIT

Counts cover `apps/web/app/page.tsx` and every `*.tsx` under `apps/web/app/components/`; match count is hardcoded hex/RGB/HSL and literal Tailwind color-class occurrences. Token classes (`text-ide-*`, etc.) are not counted. Each row gives the five highest-hit lines (or all when fewer), with a brief category. Colors in language identity, Google branding, semantic chart series, and user-editable theme swatches are explicitly marked where applicable.

| File (approx. lines) | Hits | Five worst lines: line (category) |
| --- | ---: | --- |
| `app/page.tsx` (139) | 10 | 64 (error boundary bg/text); 65 (error panel bg/border); 71 (Cyber Mint reload CTA); 90 (hydration bg/text); 25 (loading panel bg) |
| `components/ide/Primitives.tsx` (143) | 0 | — |
| `components/ActivityPage.tsx` (1,009) | 209 | 456 (button bg/text/border); 719 (control bg/text/border); 677 (input bg/text/border); 409 (chart panel gradient/shadow); 469 (chart/button bg/shadow) |
| `components/ApiSandboxPage.tsx` (1,962) | 475 | 1244 (action gradient/text/shadow); 984 (native select bg/text/border); 811 (toolbar control bg/text/border); 824 (icon control bg/text/border); 832 (avatar gradient/ring) |
| `components/AppShell.tsx` (955) | 0 | — |
| `components/CloudCoreDashboard.tsx` (1,215) | 133 | 637 (input bg/text/border); 673 (action button bg/text); 802 (input bg/border); 982 (control bg/text/border); 1175 (dialog input bg/border) |
| `components/CommandPalette.tsx` (446) | 0 | — |
| `components/CustomPlanPage.tsx` (345) | 66 | 213 (plan card bg/border/accent); 159 (billing toggle bg/text); 167 (billing toggle bg/text); 235 (selection border/text); 130 (back button text/accent ring) |
| `components/DeploymentsPage.tsx` (903) | 201 | 622 (control bg/text/border); 636 (control bg/text/border); 659 (input bg/text/border); 233 (action bg/text/border); 394 (deployment card bg/border) |
| `components/EditorWorkbench.tsx` (4,309) | 151 | 2736 (toolbar bg/text/border); 2748 (toolbar bg/text/border); 2766 (save action bg/text/border); 3261 (Quick Open gradient/shadow); 3437 (find/replace input bg/text/border) |
| `components/FriendlyHelpers.tsx` (161) | 0 | — |
| `components/FullScreenAiPage.tsx` (684) | 130 | 574 (status badge bg/text/border); 325 (model control bg/text/border); 379 (toolbar bg/text/border); 314 (brand accent badge); 394 (status/control bg/text/border) |
| `components/LoginPage.tsx` (442) | 11 | 178 (Google button bg/text); 129 (login panel shadow); 190 (Google logo blue); 194 (Google logo green); 198 (Google logo yellow) |
| `components/OnboardingTour.tsx` (112) | 0 | — |
| `components/PageHeader.tsx` (97) | 0 | — |
| `components/PaymentMethodsPage.tsx` (278) | 88 | 268 (secondary button bg/text/border); 83 (header gradient/shadow); 172 (payment card bg/border); 219 (Cyber Mint payment CTA); 77 (text/accent focus ring) |
| `components/PricingPage.tsx` (464) | 141 | 267 (Cyber Mint plan CTA); 149 (plan button bg/text/border); 337 (plan button bg/text/border); 456 (secondary button bg/text/border); 55 (Cyber Mint badge) |
| `components/RemoteControlPage.tsx` (467) | 122 | 407 (control button bg/text/border); 441 (toolbar bg/text/border); 206 (warning status bg/text/border); 450 (toolbar bg/text/border); 121 (Cyber Mint accent icon) |
| `components/RepositoriesPage.tsx` (539) | 11 | 469 (validation border); 89 (TypeScript language dot—fixed); 90 (Python language dot—fixed); 91 (Rust language dot—fixed); 92 (Go language dot—fixed) |
| `components/SiteSettingsPage.tsx` (727) | 0 | — |
| `components/SkeletonLoaders.tsx` (114) | 0 | — |
| `components/TeamChatPage.tsx` (631) | 129 | 102 (role badge colors—semantic); 132 (role badge colors—semantic); 167 (role badge colors—semantic); 215 (icon control bg/text); 228 (active channel bg/text/ring) |
| `components/TerminalPanel.tsx` (544) | 0 | — |
| `components/ThemePalettePage.tsx` (1,033) | 74 | 775 (editable swatch label bg/text); 809 (editable swatch label bg/text); 926 (light swatch action bg/text); 737 (swatch label bg); 89 (tonal-ramp color) |
| `components/ToastContainer.tsx` (57) | 0 | — |
| `components/WorkspacesPage.tsx` (773) | 0 | — |

Fixed-purpose color notes: brand logos/accent samples occur in `LoginPage.tsx` and Cyber Mint CTAs; repository language identity dots in `RepositoriesPage.tsx`; activity/deployment/cloud/API/AI status and chart-series colors encode data or status; theme palette ramps and color inputs are user-editable samples. Fixed white text/backgrounds are also used across several dark-designed screens and can contrast poorly when color mode is light; see Known Problems.

## 8. SHARED UI

| Component group | Path | Token use |
| --- | --- | --- |
| Button, IconButton, Tooltip, Kbd, Badge, Input, Panel, Tabs, Resizer, Modal, Dropdown, Switch | `apps/web/app/components/ide/Primitives.tsx`; styles in `apps/web/app/globals.css` | `ide-*` component classes resolve to theme tokens |
| Page header/breadcrumbs | `apps/web/app/components/PageHeader.tsx` | Semantic `ide-*` tokens |
| Alert/confirm, help, friendly hint | `apps/web/app/components/FriendlyHelpers.tsx` | Semantic tokens and `color-mix()` |
| Toasts | `apps/web/app/components/ToastContainer.tsx` | Semantic tokens per toast status |
| Loading placeholders | `apps/web/app/components/SkeletonLoaders.tsx` | Semantic surface/text tokens |
| App shell navigation/buttons/menus | `apps/web/app/components/AppShell.tsx` | Mostly semantic tokens; user accent inline |
| Native form controls | Screen component files listed above | Mixed; theme switcher is native `<select>`, many page-specific controls use fixed classes |

## 9. EDITOR AREA

- Main IDE/workbench: `apps/web/app/components/EditorWorkbench.tsx`.
- Monaco wrapper/dependency: `@monaco-editor/react`; dynamic client-only import in `apps/web/app/page.tsx`; loader/CDN and theme registration in `EditorWorkbench.tsx`.
- Theme import/Monaco conversion and `defineTheme`: `apps/web/app/editor/vscodeThemeConverter.ts`.
- Explorer, tree, local file/directory import, tabs, breadcrumbs, search/replace, split view, status bar, Quick Open, and AI drawer: `EditorWorkbench.tsx`.
- Terminal pane/xterm and `@xterm/addon-fit`, `@xterm/addon-web-links`: `apps/web/app/components/TerminalPanel.tsx`.
- Editor state/session persistence: `apps/web/app/context/AppContext.tsx`; local file handles: IndexedDB `devpulse-editor-handles`.
- Language server and completion services: `apps/web/app/services/languageServer.ts`, `apps/web/app/services/aiCompletion.ts`; editor mock data: `apps/web/app/services/editorMocks.ts`; snippets: `apps/web/app/editor/snippets.ts`.
- Editor shortcut hints: `apps/web/app/components/EditorWorkbench.tsx`, `apps/web/app/components/CommandPalette.tsx`; status bar exposes language, line/column, encoding, notifications, and settings.

## 10. KNOWN PROBLEMS

- Native selects remain: theme switcher in `SiteSettingsPage.tsx`; font/tab size in `EditorWorkbench.tsx`; activity filters, API scenario/method/latency, and repository language controls in their page files. Native option popup colors may follow browser/OS styling rather than app tokens.
- Hardcoded `text-white`/fixed light text and fixed dark surfaces remain in `ActivityPage.tsx`, `ApiSandboxPage.tsx`, `CloudCoreDashboard.tsx`, `DeploymentsPage.tsx`, `EditorWorkbench.tsx`, `FullScreenAiPage.tsx`, `PaymentMethodsPage.tsx`, `PricingPage.tsx`, `RemoteControlPage.tsx`, and `TeamChatPage.tsx`; these can reduce contrast in light mode.
- The color mode remains selectable in `LoginPage.tsx`, `ThemePalettePage.tsx`, and `SiteSettingsPage.tsx`; `matchSystemTheme` and `devpulse_color_mode` are also active. No theme selector is in the editor status bar; the top-bar palette icon opens the command palette.
- Some page-specific backgrounds, borders, gradients, and chart/status colors are literal rather than semantic tokens; page tokens update while these literals remain fixed.
- Imported VS Code Monaco theme data is retained in `ThemeConfig.monaco`; built-in Monaco definitions are derived from UI/syntax tokens at mount and on theme change.
- Root `apps/web/app/page.tsx` error/loading fallbacks include fixed dark surfaces, white text, and Cyber Mint accent values.
- `readStoredPage()` casts the saved page string to `PageType` without validating it against the union; an obsolete/invalid page ID can render an empty shell.

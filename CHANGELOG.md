# SpecDesk — Version Changelog

All notable changes to **SpecDesk** (formerly *Playwright Embedded Desktop Studio*) are documented in this file and in the detailed release reports under [`docs/releases/`](./docs/releases/).

---

## [Unreleased]

### Changed
- **Rebranded to SpecDesk:**
  - Updated application branding, package name (`specdesk`), Electron `appId` (`com.specdesk.app`), window titles, installer output (`SpecDesk-Setup-*.exe`), HTML report footer, and in-page inspector toolbar.
  - Restructured documentation and release reports into [`docs/plans/ROADMAP.md`](./docs/plans/ROADMAP.md) (public), `docs/plans/local/` (gitignored daily/working plans), [`docs/releases/`](./docs/releases/), and root [`CHANGELOG.md`](./CHANGELOG.md).
  - Updated `.gitignore` to exclude build artifacts (`dist-release/`), local test workspace (`test-workspace/`), and local working plans (`docs/plans/local/`).
  - Added `.prettierrc` and renamed process helper to `scripts/kill-specdesk.ps1`.

---

## [v1.5.0] - 2026-09-10
*Detailed report: [v1.5.0-windows-nsis-installer.md](./docs/releases/v1.5.0-windows-nsis-installer.md)*

### Added
- **Official Windows NSIS Setup Installer**:
  - Interactive setup wizard allowing custom installation directory selection.
  - Automatic creation of Desktop and Start Menu shortcuts.
  - Registered in Windows Programs & Features with dedicated clean uninstaller.
  - Preserves user workspaces and test data across upgrades (`deleteAppDataOnUninstall: false`).
  - Signed with Authenticode SHA-256 certificate and unblocked for immediate deployment.

---

## [v1.4.0] - 2026-09-08
*Detailed report: [v1.4.0-draggable-inpage-toolbar.md](./docs/releases/v1.4.0-draggable-inpage-toolbar.md)*

### Added
- **Draggable In-Page Floating Toolbar**:
  - Added drag handle `⠿` allowing testers to reposition the companion toolbar anywhere on the web page.
  - Implemented viewport boundary clamping to keep toolbar on screen.
  - Added coordinate persistence in `sessionStorage` across page navigations and reloads.
- **Collapsible / Minimizable Floating Capsule**:
  - Minimize button `—` collapses the bar into a compact pill `[⠿ ⚡ SpecDesk PageName ⛶]`.
  - Expand button `⛶` restores full controls.
- **Close Button & Auto-Recovery**:
  - Close button `✕` dismisses toolbar for a 100% clean webpage.
  - Activating Pick Element from Desktop Studio automatically restores the toolbar.

---

## [v1.3.0] - 2026-09-08
*Detailed report: [v1.3.0-searchable-combobox-and-element-suggestions.md](./docs/releases/v1.3.0-searchable-combobox-and-element-suggestions.md)*

### Added
- **Searchable Combobox Component (`SearchableCombobox.tsx`)**:
  - Replaced native HTML `<datalist>` with an interactive popup combobox.
  - Allows free manual typing for dynamic tokens (`{{ROW_INDEX}}`) or custom values while offering a full dropdown list.
  - Keyboard navigation (`ArrowDown`/`ArrowUp`, `Enter`, `Escape`/`Tab`), click-outside detection, and focus retention.
- **Smart Element Suggestions with Selector Preview**:
  - `Page Object`: Dropdown lists all pages in the bound repository with element counts.
  - `Element Key`: Displays bold element keys with full CSS/XPath selector preview expressions and active checkmarks.

---

## [v1.2.0] - 2026-09-08
*Detailed report: [v1.2.0-action-parity-locator-binding-and-scraper.md](./docs/releases/v1.2.0-action-parity-locator-binding-and-scraper.md)*

### Added
- **Complete 43 Actions Parity**: Added `clear`, `verify_unchecked`, `verify_value`, `api_put`, `api_patch`, and `NETWORK` category (`mock_route`, `unmock_route`).
- **Strict Locator Repository Binding Constraint**: Scoped `availablePages` and `locatorMap` to `scenario.config.locatorFile` with warning banner and locked inputs when unbound.
- **Interactive Studio Browser Companion & Live Screen Scraper**: Persistent headed browser session (`launchSession`), real-time active URL & page title sync, 1-click `scrapeCurrentScreen`, and in-page floating toolbar.
- **Action Catalog Drawer Close Fixes**: Backdrop overlay, `Escape` key dismissal, and toggleable trigger button.

### Fixed
- Fixed selector storage structure in Locator Pool to store clean string expressions.

---

## [v1.1.0] - 2026-09-07
*Detailed report: [v1.1.0-workspace-and-multitestcase.md](./docs/releases/v1.1.0-workspace-and-multitestcase.md)*

### Added
- **Multi-TestCase Isolation**: Structured `testCases: ITestCase[]` with fresh isolated `BrowserContext` per test case.
- **Selective Re-Testing**: Run individual test cases or selected subsets without running the whole suite.
- **Workspace Management & Authenticode Signing**: Delete/remove recent workspaces and `scripts/sign-exe.ps1`.

---

## [v1.0.0] - 2026-09-06
*Detailed report: [v1.0.0-initial-portable.md](./docs/releases/v1.0.0-initial-portable.md)*

### Added
- Initial standalone Electron desktop studio with embedded `playwright-core`.
- Embedded `ActionEngine`, Scenario Studio, Locator Pool Studio, Test Runner Panel, and standalone HTML report generator.

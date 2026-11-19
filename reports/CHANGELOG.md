# Playwright Desktop Studio - Version Changelog

All notable changes to the **Playwright Embedded Desktop Studio** project are documented in this file and in the detailed version reports in this directory.

---

## [v1.5.0] - 2026-09-10
*Detailed report: [v1.5.0-windows-nsis-installer.md](./v1.5.0-windows-nsis-installer.md)*

### Added
- **Official Windows NSIS Setup Installer**:
  - Generated `Playwright Embedded Studio-Setup-1.0.0.exe` (~85.3 MB) via NSIS wizard.
  - Interactive setup wizard allowing custom installation directory selection.
  - Automatic creation of Desktop and Start Menu shortcuts.
  - Registered in Windows Programs & Features with dedicated clean uninstaller.
  - Preserves user workspaces and test data across upgrades (`deleteAppDataOnUninstall: false`).
  - Signed with Authenticode SHA-256 certificate and unblocked for immediate deployment.

---

## [v1.4.0] - 2026-09-08
*Detailed report: [v1.4.0-draggable-inpage-toolbar.md](./v1.4.0-draggable-inpage-toolbar.md)*

### Added
- **Draggable In-Page Floating Toolbar**:
  - Added drag handle `⠿` allowing testers to reposition the companion toolbar anywhere on the web page.
  - Implemented viewport boundary clamping to keep toolbar on screen.
  - Added coordinate persistence in `sessionStorage` across page navigations and reloads.
- **Collapsible / Minimizable Floating Capsule**:
  - Minimize button `—` collapses the bar into a compact pill `[⠿ ⚡ Studio PageName ⛶]`.
  - Expand button `⛶` restores full controls.
- **Close Button & Auto-Recovery**:
  - Close button `✕` dismisses toolbar for a 100% clean webpage.
  - Activating Pick Element from Desktop Studio automatically restores the toolbar.

---

## [v1.3.0] - 2026-09-08
*Detailed report: [v1.3.0-searchable-combobox-and-element-suggestions.md](./v1.3.0-searchable-combobox-and-element-suggestions.md)*

### Added
- **Searchable Combobox Component (`SearchableCombobox.tsx`)**:
  - Replaced native HTML `<datalist>` with an interactive popup combobox.
  - Allows free manual typing for dynamic tokens (`{{ROW_INDEX}}`) or custom values while offering a full dropdown list.
  - Right-aligned chevron toggle button to expand/collapse options anytime.
  - Arrow key navigation (`ArrowDown`/`ArrowUp`), `Enter` to select, and `Escape`/`Tab` to dismiss.
  - Click-outside detection and automatic scrolling to highlighted items.
  - Focus retention using `onMouseDown` preventDefault to avoid blur/refocus loops.
- **Smart Element Suggestions with Selector Preview**:
  - `Page Object`: Dropdown lists all pages in the bound repository with element counts.
  - `Element Key`: Once a page is chosen, clicking or typing in the field reveals all elements belonging to that page with:
    - Bold element key name.
    - Full CSS/XPath selector preview expression (`#user-name`, `[data-test="error"]`).
    - Badge for selector type when present.
    - Checkmark indicator on the active element.
  - Maintains strict repository binding: shows `(Repo required)` and locks inputs when unbound.

---

## [v1.2.0] - 2026-09-08
*Detailed report: [v1.2.0-action-parity-locator-binding-and-scraper.md](./v1.2.0-action-parity-locator-binding-and-scraper.md)*

### Added
- **Complete 43 Actions Parity**: Integrated all remaining actions from original `swag-labs-hybrid` core:
  - Added `clear` in `ElementHelper` and `UIActionHandler`.
  - Added `verify_unchecked` and `verify_value` in `AssertHelper` and `AssertActionHandler`.
  - Added `api_put` and `api_patch` in Action Catalog and type constants.
  - Added `NETWORK` category filter (`mock_route`, `unmock_route`) in Action Catalog Drawer.
- **Strict Locator Repository Binding Constraint**:
  - Bound locator file dropdown in `ScenarioEditor` (`scenario.config.locatorFile`).
  - Scoped `availablePages` and `locatorMap` strictly to the bound repository file.
  - Warning banner when no repository is bound.
  - Locked `Page Object` and `Element Key` input fields in `StepItem` when unbound.
- **Interactive Studio Browser Companion & Live Screen Scraper**:
  - `launchSession`: Persistent headed browser window allowing manual login, 2FA, and deep navigation to any screen/modal.
  - Real-time active URL & page title synchronization with Desktop Studio.
  - `scrapeCurrentScreen`: Instant 1-click scraping of the live active screen without losing session state or cookies.
  - In-page floating toolbar (`[🎯 Pick Elements] [⚡ Scrape Screen]`) docked directly inside the browser.
  - Dual-mode `ElementPickerModal` with live screen indicators, editable keys, and 1-click import into Page Objects.
- **Action Catalog Drawer Close Fixes**:
  - Added full-screen backdrop overlay for click-outside dismissal.
  - Added global `Escape` keyboard listener.
  - Added prominent `Close (Esc)` button in header.
  - Made the trigger button in `ScenarioEditor` toggleable between open and close.
- **Process Management Helper**:
  - Added `scripts/kill-studio.ps1` to cleanly terminate background instances during rebuilds.

### Fixed
- Fixed selector storage structure in Locator Pool to store pure clean string expressions (`"button[type='submit']"` instead of nested `{ type, value }` objects).
- Fixed auto-healer to write updates directly to the scenario's bound locator repository.

---

## [v1.1.0] - 2026-09-07
*Detailed report: [v1.1.0-workspace-and-multitestcase.md](./v1.1.0-workspace-and-multitestcase.md)*

### Added
- **Multi-TestCase Isolation**: Structured `testCases: ITestCase[]` within test scenarios.
- **Isolated BrowserContext**: Each testcase runs with a fresh context (isolated cookies, storage, cache).
- **Selective Re-Testing**: Ability to run a single testcase or selected testcases without running the whole suite.
- **Workspace Management**: Ability to delete workspaces and remove recent workspace entries.
- **Authenticode Code Signing**: Script `scripts/sign-exe.ps1` to prevent Windows SmartScreen publisher warnings.

### Fixed
- Fixed workspace folder selection so external test folders are loaded directly without creating unwanted nested `data/` directories.
- Displayed upfront testcase count and step count before execution.

---

## [v1.0.0] - 2026-09-06
*Detailed report: [v1.0.0-initial-portable.md](./v1.0.0-initial-portable.md)*

### Added
- Initial standalone Electron desktop studio with embedded `playwright-core` and Chromium.
- Embedded `ActionEngine` ported from `swag-labs-hybrid`.
- Scenario Studio (visual step builder), Locator Pool Studio, and Test Runner Panel.
- Standalone zero-dependency HTML report generator.
- Portable unpacked Windows build (`dist-release/win-unpacked`).

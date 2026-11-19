# SpecDesk — Public Product Roadmap

This roadmap outlines the high-level milestones and upcoming capabilities for **SpecDesk**, a standalone low-code Playwright test automation desktop studio built on pure JSON workspaces.

---

## Completed Milestones

### v1.0 – v1.5 (Core Studio & Windows Distribution)
- **Standalone Embedded Engine:** Zero-prerequisite Electron desktop app with embedded `playwright-core` and automatic system Chrome / Edge / Chromium detection.
- **43 Core Actions Parity:** Full coverage across UI (19), Assertions (16), API (5), Network Mocking (2), and Reusable Sub-Flows (1).
- **Pure JSON Workspaces:** File-system backed JSON storage with atomic writes and real-time Chokidar sync.
- **Multi-TestCase Isolation & Selective Execution:** Isolated `BrowserContext` per test case with selective re-testing and standalone offline HTML reports.
- **Live Web Inspector & Auto-Scraper:** Persistent interactive browser companion with a draggable, minimizable in-page toolbar (`Pick Elements` & `Scrape Screen`).
- **Strict Locator Repository Binding:** Scoped Page Object & Element Key comboboxes with inline selector previews.
- **Windows NSIS Installer:** Official signed Windows setup wizard and portable build.

---

## Current Focus (Next Release)

### Core Stability & Engine Polish
- **Inspector & Picker Hardening:** Proper event listener cleanup when toggling Picker Mode off and robust CSS selector escaping.
- **Full 43-Action Visual Editor Coverage:** Context-aware step configuration forms for all UI, Assertion, API, Network, and Flow actions, plus `preconditions` / `postconditions` stage editing.
- **End-to-End Data-Driven Testing (DDT):** Wire `dataTable` rows and scenario variables directly into isolated test case execution iterations, plus RFC-4180 CSV import/export.
- **Engine Reliability:** Accurate `verify_element_count` matching, synchronized multi-tab `Page` context on `switch_new_tab`, workspace-relative path resolution for flows/uploads/storage state, and offline Vitest unit test coverage.
- **Bilingual UI (VI / EN):** Native Vietnamese & English interface toggle with Vietnamese prioritized for local QA teams.

---

## Upcoming / Planned

### Visual Regression & Reporting Enhancements
- Pixel-diff visual comparison for `verify_visual_snapshot` with workspace-managed baseline snapshots.
- Enhanced in-app HTML report viewer and execution history comparison.

### AI Agent & Self-Healing Studio (Phase 4 — Under Development)
- Dual-mode workflow: **Local Air-Gapped Mode** vs. **AI Agent Mode** (Local Ollama & privacy-masked cloud LLM adapters).
- Interactive Self-Healing Locator diff review and 1-click repository updates.
- Automated root-cause failure analysis and natural language scenario generation.

# SpecDesk — Context Map

Standalone Electron desktop studio (**SpecDesk**) for authoring, inspecting, and executing low-code Playwright test suites from pure JSON workspaces (zero target-folder dependencies).

## 1. Tech Stack & Key Dependencies
- **Runtime & Build:** Electron, `electron-vite` ^3.1, Vite 6, TypeScript 5.7 (strict), `electron-builder` ^26 (NSIS / portable Windows x64)
- **Frontend:** React 18, Tailwind CSS v4 (`@tailwindcss/vite`), Zustand v5, `lucide-react`, `clsx`, `tailwind-merge`
- **Automation & FS:** `playwright-core` ^1.50 (auto-detects system Chrome → Edge → Chromium), `chokidar` ^4, `@electron-toolkit/preload`, `@electron-toolkit/utils`

## 2. High-Level Architecture & Folder Map
- `src/main/` — Electron main process lifecycle, hardened `BrowserWindow` (`com.specdesk.app`), IPC router bootstrap.
- `src/main/ipc/` — Modular IPC handlers (`workspace`, `scenarios`, `locators`, `runner`, `inspector`, `ai`).
- `src/main/services/` — Core services: workspace recents/templates, atomic JSON I/O, Chokidar sync, Playwright runner, live browser inspector/scraper, offline HTML report generator.
- `src/main/engine/` — Embedded 43-action engine (`ActionEngine`, `DataManager`, `LocatorManager`, `FlowManager`, `AutoHealer`).
- `src/main/engine/handlers/` — Category handlers (`UI`, `Assert`, `API`, `Network`, `Flow`).
- `src/main/engine/helpers/` — Playwright primitives (`BaseHelper`, `ElementHelper`, `AssertHelper`, `APIHelper`).
- `src/preload/` — `contextBridge` exposing typed `window.electronAPI` (`index.ts`, `index.d.ts`).
- `src/shared/` — Universal IPC/domain contracts (`types.ts`) and 43-action + dynamic token registries (`constants.ts`).
- `src/renderer/src/` — React root (`main.tsx`, `App.tsx`, `index.css`).
- `src/renderer/src/stores/` — Zustand stores (`workspace.store.ts`, `tab.store.ts`, `runner.store.ts`).
- `src/renderer/src/components/layout/` — Multi-tab editor bar (`TabBar.tsx`).
- `src/renderer/src/components/scenario-studio/` — Multi-testcase visual builder (`ScenarioStudio`, `ScenarioEditor`, `StepItem`, `ActionCatalogDrawer`, `SearchableCombobox`, `DynamicTokenPicker`).
- `src/renderer/src/components/locator-pool/` — Page Object selector manager & live browser inspector modal (`LocatorPoolStudio`, `ElementPickerModal`).
- `src/renderer/src/components/ddt-grid/` — Data-Driven Testing grid with CSV import/export (`DataTableEditor`).
- `src/renderer/src/components/runner-monitor/` — Selective test runner, live step stream, failure screenshot modal & HTML report viewer (`RunnerStudio`).
- `resources/templates/data/` — Bundled Swag Labs starter scenarios and locator JSON templates.
- `docs/plans/` — Public `ROADMAP.md` and gitignored `local/` working/daily plans (`ACTION_PLAN.md`, `archive/`).
- `docs/releases/` — Historical release reports (`v1.0.0` → `v1.5.0`); root `CHANGELOG.md` indexes all releases.

## 3. Key Entry Points & Data Flow
- **Main Bootstrap:** `src/main/index.ts` → registers IPC modules (`src/main/ipc/*.ipc.ts`) → loads renderer.
- **Preload Contract:** `src/preload/index.ts` bridges renderer `window.electronAPI` calls to `ipcMain.handle` and forwards push events (`workspace:fileChanged`, `runner:stepProgress`, `runner:runFinished`, `inspector:elementCaptured`, `inspector:sessionStatusChanged`, `inspector:scrapeTriggered`).
- **Workspace & File Sync:** `src/renderer/src/stores/workspace.store.ts` ↔ `workspace.ipc.ts` / `scenarios.ipc.ts` / `locators.ipc.ts` → `workspace-service.ts`, `file-service.ts` (atomic `.tmp` → `renameSync` + self-write suppression), `watcher-service.ts` (Chokidar push events).
- **Test Execution Flow:** `RunnerStudio.tsx` / `ScenarioEditor.tsx` → `runner.store.ts` → `runner.ipc.ts` → `src/main/services/execution-service.ts` (isolated `BrowserContext` per `ITestCase`) → `src/main/engine/ActionEngine.ts` → `handlers/*` → `helpers/*` → `report-service.ts` (`<workspace>/reports/index.html`) + live IPC progress stream.
- **Live Inspector Flow:** `ElementPickerModal.tsx` → `inspector.ipc.ts` → `src/main/services/inspector-service.ts` (launches headed Playwright session, injects floating `SpecDesk` toolbar + picker overlay, binds `__studioCaptureElement` / `__studioTriggerScrape` / `__studioTogglePicker`) → pushes captured/scraped elements back to `LocatorPoolStudio.tsx`.

## 4. Build, Run & Test Commands
- **Dev server:** `npm run dev`
- **Typecheck (Node + Web):** `npm run typecheck` (`typecheck:node` + `typecheck:web`)
- **Production build:** `npm run build` (`typecheck` + `electron-vite build`)
- **Preview build:** `npm run preview` (or `npm start`)
- **Package Windows unpacked / NSIS installer:** `npm run build:dir` / `npm run build:win`
- **Kill running SpecDesk before rebuild:** `powershell -ExecutionPolicy Bypass -File scripts/kill-specdesk.ps1`
- **Sign Windows executable:** `powershell -ExecutionPolicy Bypass -File scripts/sign-exe.ps1`
- **Current integration script:** `npm test` (`node scripts/test-runner.mjs`)

## 5. Coding Conventions & Constraints
- **Electron Security:** Keep `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`; never expose Node APIs directly to renderer—route all FS/Playwright work through `src/preload/index.ts` and `src/main/ipc/`.
- **TypeScript & Imports:** Strict mode enabled (`tsconfig.node.json` & `tsconfig.web.json`); main/preload ESM imports use `.js` extensions (`./file-service.js`); renderer uses `@/*` and `@shared/*` aliases.
- **Pure JSON Workspaces:** Workspaces must remain pure JSON (`scenarios/`, `locators/`, `flows/`, `reports/`). Always use `fileService.atomicWriteJson()` to prevent corruption and Chokidar self-loops.
- **Locator Storage Format:** Store selectors as clean string values under Page Object keys (`{ "LoginPage": { "loginBtn": "#login-button" } }`), and respect `scenario.config.locatorFile` binding.
- **Product Decisions:**
  - AI features (`src/main/ipc/ai.ipc.ts`, AI controls in `App.tsx`) are temporarily gated behind an "Under Development" popup until Phase 4.
  - Target UI localization is bilingual **VI / EN** with **Vietnamese (`vi`)** prioritized as default.
- **Known Config Caveat:** `node_modules/electron/dist/version` is `34.5.8` (matching `electron-builder.json` `electronVersion: 34.5.8`), whereas `package.json` declares `electron: ^44.0.0`; `prettier` is referenced in `npm run format` but not yet installed.

## 6. Current Roadmap Pointer
- **Public Roadmap:** `docs/plans/ROADMAP.md`
- **Active Local Action Plan (gitignored):** `docs/plans/local/ACTION_PLAN.md` — execute P0 tasks (`TASK-01` → `TASK-05`) sequentially on user instruction.

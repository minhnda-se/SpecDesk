# Master Modernization & Implementation Plan: Playwright Embedded Studio

## 1. Executive Summary & Root Cause Analysis

The initial prototype utilized `vite-plugin-electron` and a legacy PostCSS toolchain which pulled in severely deprecated transitive dependencies (`glob@7/8/10`, `inflight@1.0.6`, `rimraf@3.0.2`, `tar@6`, `gauge`, `npmlog`). 

This revised plan modernizes the entire stack to the official, industry-standard **`electron-vite`** ecosystem combined with **Tailwind CSS v4**, **React 18/19**, **Zustand v5**, and **playwright-core**. It completely eliminates deprecated packages, optimizes bundle size, delivers sub-second HMR, and establishes a clean, scalable architecture for all 5 project phases.

---

## 2. Technology Stack Modernization Matrix

| Layer | Previous / Legacy Stack | **Modernized Proposed Stack (2026)** | Key Benefits |
| :--- | :--- | :--- | :--- |
| **Electron Toolchain** | `vite-plugin-electron` (deprecated deps) | **`electron-vite` ^3.x** + `@electron-toolkit/utils` | Official standard, zero deprecated sub-deps, optimized builds for Main, Preload & Renderer |
| **Styling Engine** | Tailwind CSS v3 + PostCSS + Autoprefixer | **Tailwind CSS v4 (`@tailwindcss/vite`)** | Next-generation engine, zero PostCSS config, instant CSS HMR |
| **Frontend Framework** | React 18 + custom state | **React 18 + Zustand v5 + Lucide React** | Reactive multi-tab workspace, locator store, live execution stream |
| **Code & Test Editor** | Raw text / unbundled editor | **Monaco Editor (`@monaco-editor/react`)** | Native VS Code editing engine, JSON Schema validation, Gherkin BDD highlighting |
| **Step Drag & Drop** | HTML5 DnD | **`@dnd-kit/core` + `@dnd-kit/sortable`** | Modern, smooth test step reordering |
| **Test Data Grid (DDT)** | Basic table | **`@tanstack/react-table` v8** | High-performance virtualized spreadsheet grid for Data-Driven Testing |
| **Automation Engine** | `playwright-core` | **`playwright-core` ^1.50+** | Zero-download execution via System Chrome / Edge channel auto-detection |
| **Packaging & Installer**| `electron-builder` | **`electron-builder` ^25+ (NSIS Single .exe)** | Self-contained, zero-prerequisite standalone executable (< 85 MB) |

---

## 3. Modernized Project Directory Structure

```text
playwright-desktop-studio/
├── electron-builder.json              # NSIS installer config
├── electron.vite.config.ts            # electron-vite unified configuration
├── package.json                       # Modern dependencies (zero legacy warnings)
├── tsconfig.json                      # Root TypeScript configuration
├── tsconfig.node.json                 # Main & Preload TS config
├── tsconfig.web.json                  # Renderer React TS config
├── resources/
│   └── icon.ico                       # Studio desktop icon
├── src/
│   ├── main/                          # Electron Main Process
│   │   ├── index.ts                   # Window lifecycle & strict security settings
│   │   ├── ipc/                       # Modular IPC routing
│   │   │   ├── workspace.ipc.ts       # Folder selector, recents, validation
│   │   │   ├── scenarios.ipc.ts       # Scenario JSON CRUD & list
│   │   │   ├── locators.ipc.ts        # Page Object locator CRUD
│   │   │   ├── runner.ipc.ts          # In-memory execution dispatcher
│   │   │   └── ai.ipc.ts              # Ollama / Cloud AI integration
│   │   ├── engine/                    # ⚡ Embedded Test Execution Core
│   │   │   ├── ActionEngine.ts        # Dynamic step dispatcher
│   │   │   ├── DataManager.ts         # Variable interpolation ({{TIMESTAMP}}, etc.)
│   │   │   ├── LocatorManager.ts      # Selector resolver & runtime pool
│   │   │   ├── FlowManager.ts         # Reusable sub-flow caller
│   │   │   ├── AutoHealer.ts          # AI locator auto-healing
│   │   │   ├── handlers/              # UI, API, Assert, Flow, Network handlers
│   │   │   └── helpers/               # Element, Assert, API helpers
│   │   └── services/                  # Main Process Business Logic
│   │       ├── workspace-service.ts   # Pure JSON folder binder & skeleton generator
│   │       ├── file-service.ts        # Atomic JSON I/O (.tmp -> rename)
│   │       ├── watcher-service.ts     # Chokidar real-time folder sync
│   │       ├── execution-service.ts   # In-memory Playwright runner (Chrome/Edge)
│   │       ├── report-service.ts      # Pure JS HTML/SVG report generator
│   │       └── sanitizer-service.ts   # PII & Token redaction guard
│   ├── preload/                       # Electron Preload Layer
│   │   ├── index.ts                   # contextBridge safe window.electronAPI exposure
│   │   └── index.d.ts                 # Preload type definitions
│   ├── shared/                        # Universal Shared Contracts
│   │   ├── types.ts                   # IElectronAPI, IScenario, IStep, ILocatorStore
│   │   └── constants.ts               # Action catalog, default configs, tokens
│   └── renderer/                      # React Frontend UI
│       ├── index.html                 # HTML entry with strict CSP
│       └── src/
│           ├── main.tsx               # React DOM bootstrap
│           ├── App.tsx                # Master Studio UI shell
│           ├── assets/                # UI icons, themes, fonts
│           ├── components/
│           │   ├── layout/            # TitleBar, Sidebar, TabBar, StatusBar
│           │   ├── workspace-picker/  # Landing screen & recent folders
│           │   ├── scenario-studio/   # Step builder, Action catalog drawer
│           │   ├── locator-pool/      # Page Object manager & duplicate checker
│           │   ├── ddt-grid/          # Data-driven spreadsheet editor
│           │   ├── runner-monitor/    # Live step progress & screenshot preview
│           │   └── ai-studio/         # AI Prompt generator & Healing diff view
│           └── stores/                # Zustand stores
│               ├── workspace.store.ts # Active workspace, files, watcher state
│               ├── tab.store.ts       # Multi-tab scenario/locator editors
│               └── runner.store.ts    # Execution state & live logs
```

---

## 4. Phased Implementation Roadmap

### **Phase 1: Modern Scaffold & Embedded Core Engine (Days 1–3)**
- **Task 1.1**: Initialize `electron-vite` + React + TypeScript + Tailwind CSS v4 + Lucide React.
  - Strict security: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
  - Type-safe IPC bridge exposing `window.electronAPI`.
- **Task 1.2**: Port & embed `ActionEngine`, Handlers, and Helpers into `src/main/engine/` using `playwright-core`.
- **Task 1.3**: Implement `WorkspaceService` for opening pure JSON test repositories (`data/scenarios/`, `data/locators/`) with auto-scaffold capability.
- **Task 1.4**: Implement `FileService` with atomic file I/O (`.tmp -> rename`) for zero data corruption.
- **Task 1.5**: Implement `WatcherService` (Chokidar) to sync external file modifications instantly.

### **Phase 2: Visual Scenario Studio & Locator Management (Days 4–8)**
- **Task 2.1**: Workspace file explorer & multi-tab manager.
- **Task 2.2**: Visual Drag-and-Drop step builder (`@dnd-kit`) supporting all UI, API, Assert, and Flow actions.
- **Task 2.3**: Locator Pool & Page Object manager with duplicate selector detection.
- **Task 2.4**: Data-Driven Testing (DDT) spreadsheet grid (`@tanstack/react-table`) with CSV import/export.
- **Task 2.5**: BDD Gherkin Studio with Monaco Editor and 1-click compiler to JSON.

### **Phase 3: Direct In-Memory Test Execution & Live Reporting (Days 9–12)**
- **Task 3.1**: `ExecutionService` launching System Chrome (`channel: 'chrome'`) or Edge (`channel: 'msedge'`) directly.
- **Task 3.2**: Real-time step progress streaming (`runner:stepProgress`) with visual checkmarks and timers.
- **Task 3.3**: Pure JS HTML report generator (`reports/index.html`) with embedded charts and base64 screenshots.
- **Task 3.4**: Failure Inspector with DOM snapshot preview and 1-click AI diagnostics trigger.

### **Phase 4: AI Agent Hub (Ollama + Masked Cloud) (Days 13–16)**
- **Task 4.1**: Dual-Mode configuration: `🟢 Air-Gapped Local Mode` vs `🤖 AI Agent Mode`.
- **Task 4.2**: Local Ollama adapter (`localhost:11434`) for offline models (`qwen2.5-coder`, `deepseek-coder`).
- **Task 4.3**: PII & Sensitive Token Sanitizer regex layer.
- **Task 4.4**: AI Locator Self-Healing Studio with diff review and 1-click disk update.
- **Task 4.5**: Natural Language Scenario Authoring & Root-Cause Failure Analysis agents.

### **Phase 5: Packaging & Single-Click Installer (Days 17–19)**
- **Task 5.1**: `electron-builder` configuration producing standalone `PlaywrightStudio-Setup.exe` (< 85 MB).
- **Task 5.2**: System Chrome/Edge auto-discovery and offline fallback.
- **Task 5.3**: Clean VM validation test with a pure 30KB JSON test folder.

---

## 5. Phase 1 Execution Step-by-Step (Immediate Target)

1. Clean out legacy configuration files.
2. Setup `package.json` with modern `electron-vite`, `@tailwindcss/vite`, `clsx`, `lucide-react`, `zustand`, `playwright-core`.
3. Create `electron.vite.config.ts` separating `main`, `preload`, and `renderer`.
4. Configure `tsconfig.json`, `tsconfig.node.json`, and `tsconfig.web.json`.
5. Implement `src/shared/types.ts` with comprehensive IPC contracts.
6. Configure `src/main/index.ts` with strict Electron hardening (`sandbox: true`, `contextIsolation: true`).
7. Configure `src/preload/index.ts` with `contextBridge`.
8. Create modern React UI shell with Tailwind CSS v4 and Lucide React icons.
9. Execute clean `npm install` and verify zero deprecated package warnings.
10. Run `npm run dev` and confirm clean launch.

---

## 6. Verification Plan

### Automated Verification
- `npm run build`: Verify that `electron-vite` builds Main, Preload, and Renderer without errors.
- `npx tsc --noEmit`: Strict TypeScript validation across all workspaces.

### Manual Desktop Verification
- Run `npm run dev`:
  - Confirm Electron window opens in dark mode with custom titlebar.
  - Verify `window.electronAPI` is present and functional.
  - Verify "Open Pure JSON Folder" invokes native dialog and reflects selected path.

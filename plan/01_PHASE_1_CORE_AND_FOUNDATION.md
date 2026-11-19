# Phase 1: Standalone Studio Scaffold & Embedded Core Engine

## 1. Objectives & Scope

Phase 1 establishes the standalone desktop repository (`playwright-desktop-studio`). It bundles the **ActionEngine, Strategy Handlers, and `playwright-core` directly into the Electron main process**, enabling the app to open and execute any folder containing pure JSON scenarios and locators without requiring Node.js or npm on the host machine.

- **Total Estimated Effort**: 3 – 4 Days (1 Senior Developer / SDET)
- **Target Workspace**: A standalone repository (`d:/Projects/Playwright/playwright-desktop-studio`).

---

## 2. Directory Structure of Standalone Repository

```text
playwright-desktop-studio/             # Standalone Repository
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── electron-builder.json
├── src/
│   ├── main/                          # Electron Main Process (Node.js Embedded)
│   │   ├── index.ts                   # App lifecycle & security
│   │   ├── ipc-handlers.ts            # IPC routing
│   │   ├── engine/                    # ⚡ EMBEDDED TEST EXECUTION ENGINE
│   │   │   ├── ActionEngine.ts        # Dynamic step dispatcher
│   │   │   ├── DataManager.ts         # Variable interpolation ({{TIMESTAMP}}, etc.)
│   │   │   ├── LocatorManager.ts      # Locator resolver & runtime store
│   │   │   ├── FlowManager.ts         # Sub-flow caller
│   │   │   ├── AutoHealer.ts          # AI locator healing
│   │   │   ├── handlers/              # UIActionHandler, AssertActionHandler, APIActionHandler
│   │   │   └── helpers/               # ElementHelper, AssertHelper, APIHelper
│   │   └── services/
│   │       ├── workspace-service.ts   # Project selector & Pure JSON validator
│   │       ├── file-service.ts        # Atomic JSON CRUD bound to active folder
│   │       ├── watcher-service.ts     # Chokidar listener on active folder
│   │       ├── execution-service.ts   # Direct in-memory Playwright runner
│   │       └── report-service.ts      # Pure JS HTML report builder
│   ├── preload/
│   │   └── index.ts                   # ContextBridge safe API exposure
│   └── renderer/                      # React Frontend (Vite + Tailwind)
│       └── src/
│           ├── components/
│           │   ├── workspace-picker/  # Welcome / Open Folder screen
│           │   └── layout/            # Navigation, Sidebar, Status bar
│           └── stores/                # Zustand workspace stores
```

---

## 3. Detailed Tasks & Specifications

### Task 1.1: Standalone App Scaffold & Electron Hardening
- **Objective**: Scaffold Vite + React + Tailwind CSS with strict Electron security (`nodeIntegration: false`, `contextIsolation: true`).
- **Acceptance Criteria**: App builds cleanly into a standalone desktop window.

### Task 1.2: Port & Embed ActionEngine into Desktop Core
- **Objective**: Embed `ActionEngine`, Handlers, and Helpers from `swag-labs-hybrid/utils/` directly into `src/main/engine/`.
- **Key Deliverable**:
  - The engine runs in-memory within the Electron main process, accepting a `Page` instance from `playwright-core` and executing steps loaded from pure JSON files.
- **Acceptance Criteria**:
  - An in-memory test executes against a sample JSON step without calling any external CLI commands.

### Task 1.3: Pure JSON Workspace Selector (`workspace-service.ts`)
- **Objective**: Enable opening any folder on disk that contains `data/scenarios/` and `data/locators/`.
- **Key Deliverable**:
  - `selectFolder(window)`: Invokes native directory picker.
  - Validates that selected folder contains valid JSON files.
  - Automatically creates skeleton `data/scenarios/` and `data/locators/` if opening a new empty folder.
- **Acceptance Criteria**:
  - Opening `swag-labs-hybrid` or any folder with pure JSON test files binds the workspace immediately.

### Task 1.4: Dynamic Atomic File Service (`file-service.ts`)
- **Objective**: Read and write pure JSON files in the opened workspace safely.
- **Key Deliverable**:
  - Atomic JSON write (`.tmp` -> `rename`) ensuring zero data loss.
  - File CRUD for `data/scenarios/*.json`, `data/locators/*.json`, `data/flows/*.json`.

### Task 1.5: Dynamic Real-time File Watcher (`watcher-service.ts`)
- **Objective**: Listen to external file edits in the target JSON directory.
- **Acceptance Criteria**:
  - Modifying a `.json` file externally in Notepad / VS Code instantly triggers a UI refresh via IPC.

---

## 4. Verification & Testing Plan

1. **Standalone Launch Test**:
   - Run `npm run dev` in the new repo -> Confirm Welcome Screen renders.
2. **Pure JSON Folder Loading**:
   - Create a barebones folder `C:/TestWorkspace/` containing only `data/scenarios/login.json` and `data/locators/LoginPage.json`.
   - Open it in the App -> Confirm scenarios and locators populate without requiring any Node modules in `C:/TestWorkspace/`.

# Task Execution Prompts Catalog: Embedded Playwright Studio

This catalog contains the finalized, ready-to-run prompts for building the **Embedded Playwright Studio** as an independent standalone repository.

---

## Phase 1: Studio Scaffold & Embedded Core Engine

### 🤖 Prompt for Task 1.1: Scaffold Standalone Repository
```prompt
Role: Senior Electron & Frontend Architect
Objective: Scaffold the standalone repository for Playwright Embedded Studio.
Target Repository: d:/Projects/Playwright/playwright-desktop-studio

Instructions:
1. Initialize a standalone Electron + Vite + React + TypeScript repository.
2. Install Tailwind CSS, Lucide React icons, and configure tsconfig paths.
3. Configure Electron main process in `src/main/index.ts` with strict security:
   - contextIsolation: true
   - nodeIntegration: false
   - sandbox: true
4. Create preload bridge in `src/preload/index.ts` exposing safe `window.electronAPI`.
5. Add npm scripts: "dev", "build", "preview".

Verification:
Run `npm run dev` and confirm a clean dark-mode desktop window launches.
```

---

### 🤖 Prompt for Task 1.2: Port & Embed ActionEngine into Desktop Core
```prompt
Role: Senior SDET / TypeScript Engine Specialist
Objective: Port the Playwright Hybrid ActionEngine into the Electron main process.
Target Directory: src/main/engine/

Context:
The app must execute pure JSON test scenarios in-memory without running CLI subprocesses.

Instructions:
1. Copy and adapt core engine files from `swag-labs-hybrid/utils/`:
   - `ActionEngine.ts`
   - `DataManager.ts`
   - `LocatorManager.ts`
   - `FlowManager.ts`
   - `AutoHealer.ts`
   - All Handlers: `UIActionHandler`, `AssertActionHandler`, `APIActionHandler`, `NetworkActionHandler`, `FlowActionHandler`
   - All Helpers: `ElementHelper`, `AssertHelper`, `APIHelper`
2. Update imports to use `playwright-core` types directly.
3. Add in-memory execution wrapper: `runStep(page, request, step, locators, dataRow)`.

Verification:
Write a unit test executing a `goto` and `click` step in-memory using a mocked Page.
```

---

### 🤖 Prompt for Task 1.3: Pure JSON Workspace Selector & Binder
```prompt
Role: Electron Systems Engineer
Objective: Build the native Project Folder Selector for pure JSON workspaces.
Target File: src/main/services/workspace-service.ts

Instructions:
1. Implement `WorkspaceService`:
   - `selectFolder(window)`: Invokes Electron `dialog.showOpenDialog({ properties: ['openDirectory'] })`.
   - `validateProject(folderPath)`: Checks that folder contains `data/scenarios/` and `data/locators/`. If folder is empty, auto-scaffolds the basic folder skeleton.
   - `getRecentProjects()` and `saveRecentProject(path)`: Persists recent folders in `%APPDATA%/PlaywrightStudio/recents.json`.
2. Build a "Welcome / Open Folder" landing screen in React.

Verification:
Click "Open Folder", select a folder with pure JSON test files, and confirm workspace loads in UI.
```

---

### 🤖 Prompt for Task 1.4: Dynamic Atomic File Service
```prompt
Role: Senior Node.js Systems Engineer
Objective: Implement atomic file I/O for pure JSON scenarios and locators.
Target File: src/main/services/file-service.ts

Instructions:
1. Implement `FileService` bound to active `projectRoot`.
2. Implement `atomicWriteJson(relPath, data)`:
   - Writes to `${targetPath}.tmp_${Date.now()}` first.
   - Atomically renames to targetPath.
3. Provide CRUD methods for `data/scenarios/*.json`, `data/locators/*.json`, `data/flows/*.json`.

Verification:
Verify saving a scenario writes valid JSON directly into the selected workspace folder.
```

---

### 🤖 Prompt for Task 1.5: Real-Time JSON File Watcher
```prompt
Role: Node.js Backend Engineer
Objective: Implement dynamic Chokidar watcher on active JSON workspace.
Target File: src/main/services/watcher-service.ts

Instructions:
1. When workspace opens, start watching `<projectRoot>/data/` for `.json` changes.
2. Debounce events (150ms) and suppress internal self-writes.
3. Broadcast IPC events: `file:created`, `file:updated`, `file:deleted`.

Verification:
Edit a scenario JSON file in Notepad; verify the desktop UI updates instantly.
```

---

## Phase 2: Visual Scenario Studio & Locator Pool

### 🤖 Prompt for Task 2.1: Workspace Navigation & Scenario Explorer
```prompt
Role: Senior React / UI Engineer
Objective: Build the sidebar Scenario & Feature Explorer.
Target Directory: src/renderer/src/components/layout/

Instructions:
1. Build sidebar tree-view showing `.json` files in `data/scenarios/` and `data/flows/`.
2. Add real-time fuzzy search and tag filtering (`@smoke`, `@auth`).
3. Add context menu: Create New Scenario, Clone, Rename, Delete.

Verification:
Clicking any scenario opens it in an active tab in the workspace.
```

---

### 🤖 Prompt for Task 2.2: Visual Drag-and-Drop Step Builder
```prompt
Role: Senior Frontend Engineer
Objective: Build the Visual Step Builder based on the Action Catalog.
Target Directory: src/renderer/src/components/scenario-studio/

Instructions:
1. Build `StepItem` component with action selector (UI, Assertion, API, Flow).
2. Implement drag-and-drop step reordering using `@dnd-kit/core`.
3. Add `DynamicTokenPicker` popover for inserting `{{TIMESTAMP}}`, `{{RANDOM_EMAIL}}`, `{{UUID}}`.
4. Render Preconditions, Steps, and Postconditions collapsible sections.

Verification:
Assemble a multi-step test case via the UI and save; verify resulting JSON file is valid.
```

---

### 🤖 Prompt for Task 2.3: Locator Pool Manager
```prompt
Role: Frontend UI Engineer
Objective: Build the visual Locator Manager for `data/locators/*.json`.
Target Directory: src/renderer/src/components/locator-pool/

Instructions:
1. Build a multi-page locator management table (`LoginPage`, `InventoryPage`, etc.).
2. Add duplicate selector warning detection.
3. Support selector types: CSS, XPath, Text, Role.

Verification:
Add an element `submitBtn` to `LoginPage`; confirm it immediately appears in Step Builder dropdowns.
```

---

### 🤖 Prompt for Task 2.4: Data-Driven Testing (DDT) Grid
```prompt
Role: Frontend Engineer
Objective: Build the editable spreadsheet grid for `dataTable` rows.
Target Directory: src/renderer/src/components/ddt-grid/

Instructions:
1. Integrate `@tanstack/react-table` to render and edit `testCase.dataTable` arrays.
2. Support adding/removing columns and rows with dynamic variable mapping (`{{user}}`, `{{pass}}`).
3. Add CSV Import and Export modal dialogs.

Verification:
Import a CSV file and verify it serializes cleanly into `dataTable` JSON.
```

---

## Phase 3: Direct In-Memory Execution & Live Reporting

### 🤖 Prompt for Task 3.1: In-Memory Execution Service
```prompt
Role: Senior Playwright SDET / Node.js Engineer
Objective: Build the in-memory execution service using `playwright-core`.
Target File: src/main/services/execution-service.ts

Instructions:
1. Implement `ExecutionService` extending `EventEmitter`.
2. Detect system Google Chrome (`channel: 'chrome'`) or Microsoft Edge (`channel: 'msedge'`).
3. Launch browser in-memory and execute scenario steps using the embedded `ActionEngine`.
4. Emit real-time step progress events (`stepProgress`: `RUNNING`, `PASSED`, `FAILED`).
5. Capture base64 screenshot on failure.

Verification:
Run a scenario from the UI; verify Google Chrome opens and performs actions visibly.
```

---

### 🤖 Prompt for Task 3.2: Live Step Execution Monitor UI
```prompt
Role: Frontend UI Engineer
Objective: Build the live step-by-step progress monitor.
Target Directory: src/renderer/src/components/execution-monitor/

Instructions:
1. Listen to `runner:stepProgress` IPC events.
2. Highlight the active running step with an animated spinner.
3. Mark completed steps with green checkmarks or red failure badges.
4. Display live execution timer and elapsed time.

Verification:
Run a 5-step test and verify each step card lights up in real-time as browser executes.
```

---

### 🤖 Prompt for Task 3.3: Pure JS Standalone HTML Reporter
```prompt
Role: Fullstack TypeScript Engineer
Objective: Build the standalone HTML report generator (Zero Java required).
Target File: src/main/services/report-service.ts

Instructions:
1. Compile test run results into an interactive single-file HTML report.
2. Include Pass/Fail metrics, step execution timestamps, and embedded failure screenshots.
3. Save report to `<workspace>/reports/run_<timestamp>.html`.
4. Render report in the "Reports" tab inside the App.

Verification:
Verify report opens in the app with interactive charts and screenshot zoom modal.
```

---

## Phase 4: AI Agent Hub (Privacy-Preserving)

### 🤖 Prompt for Task 4.1: Mode Switcher & App Configuration
```prompt
Role: Fullstack Engineer
Objective: Build the Global Mode Switcher (`Local Mode` vs `AI Agent Mode`).
Target Files:
- src/main/services/config-service.ts
- src/renderer/src/components/layout/Header.tsx

Instructions:
1. Manage global app configuration in `%APPDATA%/PlaywrightStudio/config.json`.
2. Provide Header Toggle: `[ 🟢 LOCAL MODE ]` vs `[ 🤖 AI AGENT MODE ]`.
3. In `Local Mode`, disable all AI network triggers and enforce 100% offline isolation.

Verification:
Switch modes and confirm active mode badge updates in the status bar.
```

---

### 🤖 Prompt for Task 4.2: Local LLM Engine (Ollama Adapter)
```prompt
Role: AI Integration Engineer
Objective: Connect the Desktop App to local Ollama instances for 100% offline AI.
Target File: src/main/services/ai/ollama-service.ts

Instructions:
1. Implement client connecting to `http://localhost:11434/api`.
2. Query `/api/tags` to list installed models (`qwen2.5-coder`, `deepseek-coder`).
3. Handle streaming completions for prompt generation.

Verification:
Trigger prompt with Ollama running locally; verify streamed text appears in UI.
```

---

### 🤖 Prompt for Task 4.3: PII & Sensitive Data Sanitizer
```prompt
Role: Application Security Engineer
Objective: Build the regex-based data sanitization guard.
Target File: src/main/services/ai/sanitizer-service.ts

Instructions:
1. Create `SanitizerService` masking:
   - Passwords, bearer tokens, API keys
   - Emails, phone numbers, credit card numbers
2. Implement DOM snapshot minifier: strip `<script>`, `<style>`, `<svg>`.

Verification:
Pass a sensitive JSON step; verify all passwords and tokens are replaced with `[REDACTED_*]`.
```

---

### 🤖 Prompt for Task 4.4: AI Self-Healing Studio & Diff Review
```prompt
Role: Fullstack AI / SDET Engineer
Objective: Build the UI audit log and 1-click disk sync for AI locator auto-healing.
Target Directory: src/renderer/src/components/ai-studio/

Instructions:
1. Listen to healing events from embedded `AutoHealer`.
2. Build an audit log panel showing:
   - Broken selector & DOM snippet
   - AI suggested replacement & confidence score
   - "Apply to Disk" / "Discard" buttons.
3. Automatically update `data/locators/*.json` upon confirmation.

Verification:
Simulate a broken locator timeout and verify the suggested fix is displayed in the healing panel.
```

---

### 🤖 Prompt for Task 4.5: Authoring & Root-Cause Failure Analysis Agents
```prompt
Role: Senior AI Engineer
Objective: Implement the Authoring Agent and Failure Analysis Agent.
Target File: src/main/services/ai/agent-service.ts

Instructions:
1. Authoring Agent:
   - Input: Natural language prompt or user story.
   - Output: Validated JSON scenario ready to be saved.
2. Failure Analysis Agent:
   - Input: Test error message, failed step, and screenshot summary.
   - Output: Concise root-cause diagnostic (Backend vs UI vs Test Data issue).

Verification:
Prompt the agent with "Test user login with invalid password"; confirm valid JSON is generated.
```

---

## Phase 5: Packaging & Zero-Prerequisite Distribution

### 🤖 Prompt for Task 5.1: Electron Builder Production Setup
```prompt
Role: DevOps / Release Engineer
Objective: Configure electron-builder for single-click Windows/Mac installers.
Target File: electron-builder.json

Instructions:
1. Configure NSIS installer for Windows:
   - Target: `nsis`, `portable`
   - Desktop icon & start menu shortcut
2. Add build script in `package.json`: `"build:dist": "vite build && electron-builder"`.

Verification:
Run `npm run build:dist` on Windows and verify `release/PlaywrightStudio-Setup-1.0.0.exe` is generated.
```

---

### 🤖 Prompt for Task 5.2: System Browser Auto-Detection & Fallback
```prompt
Role: Systems Engineer
Objective: Ensure browser automation works out-of-the-box on clean machines.
Target File: src/main/services/browser-manager.ts

Instructions:
1. Auto-check for Google Chrome at standard registry locations.
2. Fall back to Microsoft Edge if Chrome is not installed.
3. Provide optional in-app 1-click Chromium downloader for air-gapped systems without Chrome/Edge.

Verification:
Launch app on a clean Windows machine and confirm it automates Edge without error.
```

---

### 🤖 Prompt for Task 5.3: Clean VM End-to-End Release Audit
```prompt
Role: Lead QA / Security Auditor
Objective: Perform production verification on a clean Virtual Machine.

Instructions:
1. Copy installer `.exe` to a fresh VM with zero developer tools installed.
2. Install app and open a folder with pure JSON test cases.
3. Run tests in `Local Mode` (with network disabled) and verify execution & report generation.

Verification:
Document all test results and mark the release checklist as PASSED.
```

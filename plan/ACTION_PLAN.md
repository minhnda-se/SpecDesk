# Project Audit & Action Plan

## 1. Executive Summary
- **Project Overview:** **Playwright Embedded Studio** is a standalone, low-code desktop test automation IDE built with Electron, React 18, TypeScript, Tailwind CSS v4, Zustand v5, and `playwright-core`. It enables QA engineers and non-technical testers to visually author, inspect/scrape, and execute multi-testcase UI, API, Network, Assertion, and Sub-Flow automation suites directly from pure JSON workspaces without requiring Node.js, npm, or compilers on target machines.
- **Current Maturity:** **Advanced MVP / Pre-production (~75% complete)**. Core workspace management, the 43-action execution engine, isolated `BrowserContext` per test case, live web element picker/scraper with in-page floating toolbar, and Windows NSIS installer packaging are implemented. However, several runtime blockers exist in `InspectorService`, `StepItem.tsx`, `ExecutionService`, `LocatorManager`, and `ElementHelper`, while Phase 4 AI capabilities and `verify_visual_snapshot` remain non-functional stubs.
- **Top 3 Risks / Bottlenecks:**
  1. **Broken Action Configuration & Unwired DDT Execution (`src/renderer/src/components/scenario-studio/StepItem.tsx`, `src/main/services/execution-service.ts`):** `StepItem.tsx` only renders value/parameter inputs for 5 out of 43 actions, omits `ACTION_CATEGORIES.NETWORK` from the action selector, and binds `goto` to `step.url` while templates (`resources/templates/data/scenarios/swag-lab-scenarios.json`) and `UIActionHandler.ts` prioritize `step.data`. Furthermore, `ExecutionService.runInternal()` hardcodes an empty `{}` `dataRow` (line 248), completely ignoring `testCase.dataTable` and `scenario.variables`.
  2. **Engine Runtime Bugs (`src/main/services/inspector-service.ts`, `src/main/engine/LocatorManager.ts`, `src/main/engine/helpers/ElementHelper.ts`):** Toggling Picker Mode OFF in `InspectorService.removePickerOverlay()` (lines 280–289) removes DOM overlays without detaching capturing `click`/`mouseover` listeners, permanently blocking webpage clicks; `LocatorManager.getLocator()` (lines 19, 29, 36) appends `>> nth=0` to every selector, causing `AssertHelper.verifyElementCount()` (line 209) to never return a count `> 1`; and `ElementHelper.switchNewTab()` (lines 92–104) only updates `this.page` locally inside `ElementHelper`, leaving `AssertHelper`, `NetworkActionHandler`, `AutoHealer`, and `ExecutionService` pointing to the old tab.
  3. **Hardcoded Paths, Process Leaks & Unchecked Folder Deletion (`src/main/engine/FlowManager.ts`, `src/main/services/execution-service.ts`, `src/main/services/workspace-service.ts`):** `FlowManager`, `AutoHealer`, `ElementHelper.uploadFile`, and `UIActionHandler` (`save_storage_state`) resolve paths against `__dirname` or `process.cwd()` instead of the active workspace; early errors in `ExecutionService.runInternal()` (lines 185, 195) throw after `chromium.launch()` without closing the browser or emitting `runner:runFinished`; and `WorkspaceService.deleteWorkspaceFolder()` (line 79) executes `fs.rmSync(folderPath, { recursive: true, force: true })` without path safety guards.

---

## 2. Execution Roadmap

### Phase 1: Critical Fixes & Blockers (P0)

- [ ] **[TASK-01] Fix Live Web Inspector Picker Listener Leak, Deduplicate Helpers & Escape Selectors** *(Effort: S | Depends on: None)*
  - **Why:** In `src/main/services/inspector-service.ts`, `injectPickerCode()` (lines 643–837) attaches anonymous capturing `mouseover` and `click` listeners (`document.addEventListener('click', ..., true)` with `e.preventDefault(); e.stopPropagation()`). When `removePickerOverlay()` (lines 280–289) is called, it removes `#__studio_picker_overlay` and `#__studio_picker_badge` and resets `__studioPickerInjected = false`, but never removes the event listeners. Once Picker Mode is activated once, normal clicks on the web page remain blocked even when Picker Mode is OFF, and toggling Picker Mode stacks duplicate listeners. Additionally, ~85 lines of `toCamelCase`, `getOptimalSelector`, and `getSuggestedKey` are duplicated verbatim between `injectPickerCode` (lines 678–761) and `scrapeInteractiveElementsCode` (lines 844–927), and attribute selectors do not escape quotes.
  - **Target Files:** `src/main/services/inspector-service.ts`
  - **Implementation Notes:**
    1. Store named listener references on `(window as any).__studioPickerMouseOver` and `(window as any).__studioPickerClick` inside `injectPickerCode()`, and explicitly call `document.removeEventListener('mouseover', ..., true)` and `document.removeEventListener('click', ..., true)` inside `removePickerOverlay()`.
    2. Escape single/double quotes in `getOptimalSelector()` attribute and `:has-text(...)` expressions so attributes containing apostrophes or quotes do not produce invalid CSS selectors.
    3. Consolidate shared selector generation logic or keep the serialized functions consistent across `injectPickerCode` and `scrapeInteractiveElementsCode`.
  - **Verification:** Run `npm run typecheck`; launch the Interactive Web Inspector in `npm run dev`, toggle Picker ON, capture an element, toggle Picker OFF, and confirm normal clicks/navigation on the target webpage work without firing `inspector:elementCaptured`.

- [ ] **[TASK-02] Harmonize `goto` URL Field (`url` vs `data`) & Complete `StepItem.tsx` Form Controls for All 43 Actions** *(Effort: M | Depends on: None)*
  - **Why:**
    1. Bundled templates (`resources/templates/data/scenarios/swag-lab-scenarios.json` line 16, `swag-labs-login.json` line 17) and `ScenarioEditor.tsx` (`handleAddTestCase`, line 250) store the `goto` URL in `step.data`, whereas `StepItem.tsx` (lines 291–311) binds the `Target URL` input only to `step.url`, and `UIActionHandler.ts` (line 46) executes `this.element.goto(resolvedData || step.url)`. Consequently, opening any bundled template shows a blank URL input on `goto` steps, and editing `step.url` in the UI is ignored at runtime because `step.data` takes precedence.
    2. `StepItem.tsx` (lines 197–225) omits `ACTION_CATEGORIES.NETWORK` (`mock_route`, `unmock_route`) from the Action `<select>` dropdown and renders `Page Object` / `Element Key` inputs for network steps.
    3. `StepItem.tsx` (lines 314–341) only renders the `Value / Data` input for 5 actions (`fill`, `verify_text`, `verify_text_contains`, `press_key`, `select_option`), leaving 20+ actions (`wait`, `wait_for_element`, `upload_file`, `save_storage_state`, `verify_value`, `verify_not_contains_text`, `verify_class_contains`, `verify_not_contains_class`, `verify_url_contains`, `verify_attribute`, `verify_element_count`, `verify_visual_snapshot`, `mock_route`, `unmock_route`, `api_*`, `call_flow`) without required input fields in Scenario Studio.
  - **Target Files:** `src/renderer/src/components/scenario-studio/StepItem.tsx`, `src/renderer/src/components/scenario-studio/ScenarioEditor.tsx`, `src/main/engine/handlers/UIActionHandler.ts`, `src/main/engine/handlers/AssertActionHandler.ts`
  - **Implementation Notes:**
    1. In `StepItem.tsx`, read the URL field for `goto` (and `verify_url_contains`) as `step.url || (typeof step.data === 'string' ? step.data : '')`; when updated, set `url: newVal` and synchronize/clear redundant `data` so templates and new scenarios behave identically. In `UIActionHandler.ts` (line 46), resolve `this.dataManager.resolve(step.url) || resolvedData`.
    2. Add `<optgroup label="Network Actions">` mapping `ACTION_CATEGORIES.NETWORK` in `StepItem.tsx`, and exclude network actions from `needsElement` / Page & Element inputs.
    3. Expand `StepItem.tsx` form controls to cover all 43 actions:
       - **Value / Data input:** `fill`, `press_key`, `select_option`, `upload_file`, `save_storage_state`, `wait`, `verify_value`, `verify_text`, `verify_text_contains`, `verify_not_contains_text`, `verify_class_contains`, `verify_not_contains_class`, `verify_url_contains`, `verify_attribute`, `verify_element_count`.
       - **Specialized fields:** `attribute` input for `verify_attribute`; `count` / numeric data for `verify_element_count`; `state` (`visible` | `hidden` | `attached` | `detached`) and `timeout` for `wait_for_element`; `snapshotName` & `maxDiffPixelRatio` for `verify_visual_snapshot`; `url`, `status`, and `mockData` for `mock_route` / `unmock_route`; request payload (`data`), `headers` (JSON string or key-value), and `store_response` (`key`, `variable`) for `api_get`, `api_post`, `api_put`, `api_patch`, `api_delete`; and `params` (JSON object) for `call_flow`.
  - **Verification:** Run `npm run typecheck`; open `swag-lab-scenarios.json` in Scenario Studio and verify `goto` steps display `https://www.saucedemo.com/` and every action across UI, Assertion, API, Network, and Flow renders its required configuration inputs.

- [ ] **[TASK-03] Fix `LocatorManager` `>> nth=0` Injection Breaking `verify_element_count` & Synchronize `Page` Reference Across `switch_new_tab`** *(Effort: M | Depends on: None)*
  - **Why:**
    1. `LocatorManager.getLocator()` (`src/main/engine/LocatorManager.ts`, lines 19, 29, 36) forces `locator.includes('nth=') ? locator : `${locator} >> nth=0`` on every resolved selector. When `AssertHelper.verifyElementCount()` (`src/main/engine/helpers/AssertHelper.ts`, line 209) calls `await this.page.locator(locatorStr).count()`, Playwright evaluates the count on the `nth=0` sub-locator, which can only return `0` or `1`. Any `verify_element_count` expecting `> 1` elements always fails.
    2. `ElementHelper.switchNewTab()` (`src/main/engine/helpers/ElementHelper.ts`, lines 92–104) reassigns `this.page` only on the `ElementHelper` instance. `AssertHelper`, `NetworkActionHandler`, `AutoHealer`, and `ExecutionService` (failure screenshots at `src/main/services/execution-service.ts`, line 360) retain the old `Page` reference, causing post-switch assertions and screenshots to execute against the original tab.
  - **Target Files:** `src/main/engine/LocatorManager.ts`, `src/main/engine/ActionEngine.ts`, `src/main/engine/helpers/BaseHelper.ts`, `src/main/engine/helpers/ElementHelper.ts`, `src/main/engine/helpers/AssertHelper.ts`, `src/main/engine/handlers/NetworkActionHandler.ts`, `src/main/engine/AutoHealer.ts`, `src/main/services/execution-service.ts`
  - **Implementation Notes:**
    1. Update `LocatorManager.getLocator(pageName, elementName, options?: { raw?: boolean })` (or stop appending `>> nth=0` in `LocatorManager` for count assertions and strip trailing `>> nth=0` in `AssertHelper.verifyElementCount()`).
    2. Expose `getPage(): Page` / `setPage(page: Page): void` on `ActionEngine` (or a shared `PageSession` object passed to `BaseHelper`, `NetworkActionHandler`, `AutoHealer`, and queried by `ExecutionService` at line 358 when capturing failure screenshots) so `switchNewTab()` updates the active `Page` reference across all engine components.
  - **Verification:** Run `npm run typecheck`; test `verify_element_count` on a multi-item selector (e.g., `.inventory_item` with count `6`) and verify `switch_new_tab` updates the active page for subsequent `verify_*` steps.

- [ ] **[TASK-04] Wire Data-Driven Testing (`dataTable` & `variables`) into `ExecutionService` & Add Missing Dynamic Tokens to `DataManager`** *(Effort: M | Depends on: None)*
  - **Why:**
    1. `ExecutionService.runInternal()` (`src/main/services/execution-service.ts`, lines 219–251) executes each `testCase` only once and passes a hardcoded `{}` `dataRow` into `new ActionEngine(page, context.request, combinedLocators, {}, ...)`, completely ignoring `testCase.dataTable` (configured via `DataTableEditor.tsx`) and `scenario.variables`.
    2. `DYNAMIC_TOKENS` (`src/shared/constants.ts`, lines 61–68) lists `{{RANDOM_NAME}}` and `{{RANDOM_NUMBER_6}}`, but `DataManager.resolve()` (`src/main/engine/DataManager.ts`, lines 28–49) does not implement either token, leaving literal `{{RANDOM_NAME}}` and `{{RANDOM_NUMBER_6}}` strings uninterpolated at runtime.
    3. Editing `DataTableEditor` on a flat scenario in `ScenarioEditor.tsx` (lines 800–810) creates `prev.testCases` without deleting `prev.steps`.
  - **Target Files:** `src/main/services/execution-service.ts`, `src/main/engine/DataManager.ts`, `src/renderer/src/components/scenario-studio/ScenarioEditor.tsx`
  - **Implementation Notes:**
    1. In `DataManager.ts` (lines 28–49), add `case 'RANDOM_NAME':` (generating realistic randomized test names) and `case 'RANDOM_NUMBER_6':` (`Math.floor(100000 + Math.random() * 900000).toString()`).
    2. In `ExecutionService.ts`, expand each test case in `testCasesToRun`: if `Array.isArray(tc.dataTable) && tc.dataTable.length > 0`, run an isolated `BrowserContext` iteration per row with `dataRow = { ...(scenario.variables || {}), ...row, ROW_INDEX: String(rowIdx + 1) }` and label the run/report steps with the iteration index (e.g., `TC_01 [Row 1]`). If `dataTable` is empty, pass `{ ...(scenario.variables || {}) }` as `dataRow`.
    3. In `ScenarioEditor.tsx` (lines 800–810), remove `prev.steps` when migrating a flat scenario to `testCases` on `DataTableEditor` change.
  - **Verification:** Run `npm run typecheck`; execute a test case with a 2-row `dataTable` and `{{RANDOM_NAME}}` / `{{RANDOM_NUMBER_6}}` tokens and confirm both rows run in isolated contexts with interpolated values.

- [ ] **[TASK-05] Fix Hardcoded `__dirname`/`process.cwd()` Engine Paths, Prevent Browser Leaks on Early Errors & Harden File/Folder Deletion** *(Effort: M | Depends on: None)*
  - **Why:**
    1. `FlowManager.ts` (line 10) defaults to `path.join(__dirname, '../../data/flows')` and caches flows in a static `FlowManager.flowsCache` that is never invalidated; `AutoHealer.ts` (lines 11, 105) resolves locators and writes `heal-report.json` relative to `__dirname`; `ElementHelper.uploadFile` (line 67) and `UIActionHandler` `save_storage_state` (line 108) resolve relative paths against `process.cwd()`. All fail when running from a packaged NSIS installation or against an external workspace folder.
    2. `ExecutionService.runInternal()` (`src/main/services/execution-service.ts`, lines 167–198) launches `browser` before validating `testCasesToRun`. If line 185 or 195 throws, `browser` is leaked and `notifyFinished()` is never invoked, leaving the Runner UI permanently stuck in `isRunning: true`.
    3. `WorkspaceService.deleteWorkspaceFolder()` (`src/main/services/workspace-service.ts`, lines 71–86) runs `fs.rmSync(folderPath, { recursive: true, force: true })` without checking for drive roots, system directories, or app directories, and `FileService.resolve*Path()` (`src/main/services/file-service.ts`, lines 97–206) allows arbitrary absolute paths or `../` traversal outside the workspace.
  - **Target Files:** `src/main/engine/FlowManager.ts`, `src/main/engine/AutoHealer.ts`, `src/main/engine/helpers/ElementHelper.ts`, `src/main/engine/handlers/UIActionHandler.ts`, `src/main/services/execution-service.ts`, `src/main/services/workspace-service.ts`, `src/main/services/file-service.ts`
  - **Implementation Notes:**
    1. Update `FlowManager.getFlow()` to resolve flow files via `fileService.resolveFlowPath(flowName)` and remove the stale static cache (or invalidate it via `WatcherService`).
    2. Resolve relative paths in `ElementHelper.uploadFile()`, `UIActionHandler` (`save_storage_state`), and `AutoHealer.recordHealProposal()` against `workspaceService.getActiveWorkspace() || process.cwd()`.
    3. In `ExecutionService.runInternal()`, validate `testCasesToRun` (lines 169–198) *before* launching the browser, and wrap browser execution in a `try / catch / finally` block that always closes `browser`, cleans `this.activeBrowsers`, and calls `notifyFinished()`.
    4. In `WorkspaceService.deleteWorkspaceFolder()`, block deletion of filesystem roots, OS home/system directories, or `process.cwd()`, and in `FileService.resolve*Path()`, verify that the resolved path stays inside `this.getProjectRoot()`.
  - **Verification:** Run `npm run typecheck`; trigger a run on an empty scenario and confirm `runner:runFinished` fires with `status: 'failed'` and zero orphan browser processes.

---

### Phase 2: Architecture, Refactoring & Testing (P1)

- [ ] **[TASK-06] Enforce Bound `scenario.config.locatorFile` at Runtime & Remove Redundant Pass Screenshots in `AssertHelper`** *(Effort: S | Depends on: TASK-03)*
  - **Why:**
    1. While `ScenarioEditor.tsx` (lines 36–95) enforces strict binding to `scenario.config.locatorFile`, `ExecutionService.runInternal()` (`src/main/services/execution-service.ts`, lines 101–124) loads and merges *all* locator files in the workspace into `combinedLocators`, causing Page Object collisions when multiple locator repositories define the same page name.
    2. Every assertion method in `AssertHelper.ts` (lines 17–224) calls `await this.captureEvidence(stepDescription, 'PASS')` and `'FAIL'` (`BaseHelper.ts`, lines 11–14), which executes `await this.page.screenshot()` and discards the returned `Buffer`, adding ~100–300ms of latency to every passing assertion while `ExecutionService` (line 360) already captures failure screenshots.
  - **Target Files:** `src/main/services/execution-service.ts`, `src/main/engine/helpers/AssertHelper.ts`, `src/main/engine/helpers/BaseHelper.ts`
  - **Implementation Notes:**
    1. In `ExecutionService.runInternal()`, if `scenario.config?.locatorFile` is specified, load only `fileService.readLocators(scenario.config.locatorFile)` into `combinedLocators` (falling back to merging all locator files only when `scenario.config?.locatorFile` is unset).
    2. Remove the unused `await this.captureEvidence(...)` calls from `AssertHelper.ts`.
  - **Verification:** Run `npm run typecheck` and execute `swag-labs-login.json` to confirm faster assertion step durations and isolated locator loading.

- [ ] **[TASK-07] Add `preconditions` and `postconditions` Stage Editors to `ScenarioEditor.tsx`** *(Effort: M | Depends on: TASK-02)*
  - **Why:** `ITestCase` (`src/shared/types.ts`, lines 65–75), `ExecutionService.ts` (lines 398–405), and `resources/templates/data/scenarios/swag-labs-login.json` (lines 14–55) support `preconditions`, `steps`, and `postconditions`. However, `ScenarioEditor.tsx` (lines 125–234, 574) only displays and edits `currentTestCase.steps`, hiding setup and teardown steps from users and displaying inaccurate step counts.
  - **Target Files:** `src/renderer/src/components/scenario-studio/ScenarioEditor.tsx`
  - **Implementation Notes:**
    1. Add a stage selector pill bar (`Preconditions (Setup)`, `Test Steps (Main)`, `Postconditions (Teardown)`) when editing a multi-testcase scenario in `ScenarioEditor.tsx`.
    2. Parameterize `handleAddStep`, `handleUpdateStep`, `handleCloneStep`, `handleDeleteStep`, and `handleMoveStep` to operate on the active stage (`preconditions` | `steps` | `postconditions`).
    3. Compute the test case badge step count as `(tc.preconditions?.length || 0) + (tc.steps?.length || 0) + (tc.postconditions?.length || 0)`.
  - **Verification:** Open `swag-labs-login.json` in Scenario Studio and verify that `preconditions` (`goto`) and `postconditions` (`menuBtn`, `logoutLink`) can be viewed, edited, reordered, and saved.

- [ ] **[TASK-08] Fix `ElementPickerModal` Filtered Selection Bug & Synchronize Workspace/Tab/Runner Stores** *(Effort: M | Depends on: None)*
  - **Why:**
    1. In `ElementPickerModal.tsx` (lines 55, 83–98, 557–584), `selectedScrapedKeys` stores array indices (`Set<number>`), but the table maps over `filteredElements.map((el, idx) => ...)` and passes the filtered index `idx` to `handleToggleSelect(idx)` and `handleUpdateElementKey(idx, ...)`. Filtering the table and toggling checkboxes or editing element keys mutates the wrong items in `scrapedElements`. Prepending captured elements (`[newEl, ...prev]`) also shifts indices.
    2. In `workspace.store.ts` (lines 81–157) and `ScenarioStudio.tsx` (lines 146–160), closing/switching workspaces or deleting a scenario does not close open tabs in `useTabStore` or reset `useRunnerStore`. Saving a locator file in `LocatorPoolStudio` also does not refresh `scopedLocatorMap` in `ScenarioEditor`.
  - **Target Files:** `src/renderer/src/components/locator-pool/ElementPickerModal.tsx`, `src/renderer/src/stores/workspace.store.ts`, `src/renderer/src/stores/tab.store.ts`, `src/renderer/src/components/scenario-studio/ScenarioStudio.tsx`, `src/renderer/src/components/scenario-studio/ScenarioEditor.tsx`
  - **Implementation Notes:**
    1. In `ElementPickerModal.tsx`, change `selectedScrapedKeys` to `Set<string>` keyed by `el.selector`, and look up items by `el.selector` in `handleToggleSelect` and `handleUpdateElementKey`.
    2. Add `clearTabs()` and `closeTab(tabId)` hooks in `useTabStore` so closing/switching workspaces clears open tabs and runner state, and deleting a scenario closes `scenario:${fileName}`.
    3. Subscribe `ScenarioEditor`'s `loadBoundLocators` effect to locator save/change events so newly added Page Objects/elements appear immediately in `StepItem` comboboxes.
  - **Verification:** Run `npm run typecheck`; filter scraped elements in `ElementPickerModal`, rename and toggle a filtered row, and confirm the exact element is imported.

- [ ] **[TASK-09] Fix Renderer CSP for Base64 Failure Screenshots & Safe HTML Report Viewing** *(Effort: S | Depends on: None)*
  - **Why:**
    1. `src/renderer/index.html` (lines 7–10) defines `default-src 'self'` without `img-src 'self' data:;`, blocking `<img src="data:image/png;base64,...">` in `RunnerStudio.tsx` (line 675).
    2. `RunnerStudio.tsx` (lines 622, 635) uses `<iframe src="file:///...">` and `<a href="file:///..." target="_blank">`, which Chromium blocks in dev mode (`http://localhost` -> `file://`).
  - **Target Files:** `src/renderer/index.html`, `src/renderer/src/components/runner-monitor/RunnerStudio.tsx`, `src/main/ipc/runner.ipc.ts`, `src/preload/index.ts`, `src/shared/types.ts`
  - **Implementation Notes:**
    1. Update the CSP `<meta>` tag in `src/renderer/index.html` to include `img-src 'self' data: blob:;`.
    2. Add IPC methods `runner:readReport(reportPath)` (returning the HTML string for `<iframe srcDoc={reportHtml} />`) and `runner:openReportExternal(reportPath)` (using Electron's `shell.openPath(reportPath)`).
  - **Verification:** Run a failing scenario in `npm run dev` and confirm the Base64 failure screenshot renders in the Failure Inspector modal and the HTML report renders inside the `HTML Report` tab and opens in the default browser on click.

- [ ] **[TASK-10] Temporarily Disable Unfinished AI Controls with an "Under Development" Modal/Popover** *(Effort: S | Depends on: None)*
  - **Why:** `src/main/ipc/ai.ipc.ts` (lines 9–36) and the AI mode/tab controls in `src/renderer/src/App.tsx` (lines 86–109, 189–198, 216–227) are currently mock stubs. Per product decision, AI buttons should be temporarily disabled or gated behind a clear "Feature Under Development" popup so users are not misled by non-functional controls.
  - **Target Files:** `src/renderer/src/App.tsx`
  - **Implementation Notes:**
    1. Gate the `AI Agent Mode` header button and `AI Self-Healing & Studio` sidebar button in `App.tsx` so clicking either opens a clean modal/toast stating that AI Agent & Self-Healing Studio is currently under development (`Tính năng đang phát triển / Under Development`) while keeping `Local Air-Gapped` mode active.
  - **Verification:** Click the AI toggle in the titlebar and the AI icon in the left sidebar in `npm run dev` and confirm the "Under Development" popup appears cleanly.

- [ ] **[TASK-11] Replace Naive CSV Split in `DataTableEditor.tsx` with RFC-4180 Quoted CSV Parser** *(Effort: S | Depends on: None)*
  - **Why:** `DataTableEditor.tsx` (`handleImportCsv`, lines 80–108) splits lines using `.split(',')`, breaking cells that contain commas inside double quotes or escaped quotes (`""`), even though `handleExportCsv` (line 67) wraps exported cells in quotes.
  - **Target Files:** `src/renderer/src/components/ddt-grid/DataTableEditor.tsx`
  - **Implementation Notes:** Implement an RFC-4180-compliant CSV line parser handling quoted strings, embedded commas, and escaped `""` characters.
  - **Verification:** Export a DDT table containing `"Smith, Jane"` and `Test "Quote"` to CSV, import it back, and verify lossless round-trip parsing.

- [ ] **[TASK-12] Establish Offline Automated Unit & Integration Test Suite with Vitest** *(Effort: M | Depends on: TASK-03, TASK-04, TASK-05)*
  - **Why:** `npm test` currently runs `scripts/test-runner.mjs`, which launches a browser against live `https://example.com` and does not import or test any file under `src/`. There are zero unit tests for `DataManager`, `LocatorManager`, `ActionEngine`, `FileService`, or `FlowManager`.
  - **Target Files:** `package.json`, `vitest.config.ts`, `src/main/engine/__tests__/engine.test.ts`, `src/main/services/__tests__/file-service.test.ts`
  - **Implementation Notes:**
    1. Add `vitest` to `devDependencies` and configure `vitest.config.ts` with path aliases (`@main`, `@shared`).
    2. Write deterministic offline unit tests for:
       - `DataManager`: runtime variables, DDT `dataRow`, and all tokens in `DYNAMIC_TOKENS` (`TIMESTAMP`, `DATE_TODAY`, `RANDOM_EMAIL`, `RANDOM_NAME`, `UUID`, `RANDOM_NUMBER_6`).
       - `LocatorManager`: nested Page Objects, flat locators, runtime updates, and `verify_element_count` compatibility.
       - `FileService`: atomic JSON writes, scenario/locator discovery, and path traversal rejection.
       - `ActionEngine`: handler routing, sub-flow recursion depth guard (`FlowActionHandler`), and tab reference synchronization.
  - **Verification:** Run `npm test` and confirm all unit tests pass offline in under 5 seconds.

---

### Phase 3: Enhancements, DX & Nice-to-Have (P2)

- [ ] **[TASK-13] Implement Bilingual (VI / EN) Localization System with Vietnamese as Default** *(Effort: M | Depends on: TASK-02, TASK-10)*
  - **Why:** The codebase currently mixes Vietnamese (`ElementPickerModal.tsx`, `APIHelper.ts`, `UIActionHandler.ts`, `AssertActionHandler.ts`) and English (`App.tsx`, `ScenarioStudio.tsx`, `ScenarioEditor.tsx`, `LocatorPoolStudio.tsx`, `RunnerStudio.tsx`). Per product decision, supporting bilingual UI (`VI` / `EN`) with Vietnamese prioritized as the default language will make the studio intuitive for non-technical Vietnamese testers while remaining accessible to English users.
  - **Target Files:** `src/shared/i18n.ts`, `src/renderer/src/stores/i18n.store.ts`, `src/renderer/src/App.tsx`, `src/renderer/src/components/scenario-studio/*`, `src/renderer/src/components/locator-pool/*`, `src/renderer/src/components/runner-monitor/RunnerStudio.tsx`, `src/renderer/src/components/ddt-grid/DataTableEditor.tsx`
  - **Implementation Notes:**
    1. Create a typed translation dictionary (`vi` default, `en` secondary) in `src/shared/i18n.ts` and a Zustand store `useI18nStore` persisted in `localStorage`.
    2. Add a `🇻🇳 VI | 🇺🇸 EN` language toggle button in the top titlebar of `App.tsx`.
    3. Localize UI labels, tooltips, empty states, confirmation dialogs, and engine validation messages across all studios.
  - **Verification:** Switch between `VI` and `EN` in the titlebar and verify all views (`Workspace`, `ScenarioStudio`, `LocatorPoolStudio`, `ElementPickerModal`, `RunnerStudio`, and `Under Development` AI modal) update immediately.

- [ ] **[TASK-14] Align Electron Versions, Linting/Formatting Configs, `.gitignore` & Documentation** *(Effort: S | Depends on: None)*
  - **Why:**
    1. `package.json` (line 42) specifies `"electron": "^44.0.0"`, `electron-builder.json` (line 5) hardcodes `"electronVersion": "34.5.8"`, and `App.tsx` (line 462) falls back to `'34.2.0'`.
    2. `package.json` (line 9) defines `"format": "prettier --write ."`, but `prettier` is not installed and no `.prettierrc` exists.
    3. `.gitignore` does not ignore `dist-release/`, `test-workspace/`, or `.recents.json`.
    4. `README.md` (lines 78, 106) references `data/reports/test_report.html`, whereas `ReportService` outputs `reports/index.html` and `reports/run_<runId>.html`.
  - **Target Files:** `package.json`, `electron-builder.json`, `.gitignore`, `.prettierrc`, `README.md`
  - **Implementation Notes:**
    1. Align `electronVersion` in `electron-builder.json` with `package.json`, install `prettier`, add `.prettierrc`, add `dist-release/` and `test-workspace/` to `.gitignore`, and update `README.md` report paths.
  - **Verification:** Run `npm run typecheck` and `npm run format -- --check`.

- [ ] **[TASK-15] Implement Pixel-Diff Visual Regression for `verify_visual_snapshot`** *(Effort: M | Depends on: TASK-05)*
  - **Why:** `AssertHelper.verifyVisualSnapshot()` (`src/main/engine/helpers/AssertHelper.ts`, lines 219–224) is currently a no-op stub that always passes without comparing images.
  - **Target Files:** `src/main/engine/helpers/AssertHelper.ts`, `package.json`
  - **Implementation Notes:** Store baseline PNG snapshots under `<activeWorkspace>/snapshots/<snapshotName>` on initial execution, and compare subsequent screenshots against the baseline buffer using `pngjs` and `pixelmatch`, throwing an assertion error with diff percentage when the mismatch ratio exceeds `maxDiffPixelRatio`.
  - **Verification:** Execute a test case with `verify_visual_snapshot` twice and verify baseline creation on first run and pixel diff validation on second run.

---

## 3. Open Questions / Decisions Needed

1. **Confirmed Product Decisions (from Stakeholder):**
   - **Execution Order:** Proceed through **Phase 1 (P0)** tasks sequentially (`TASK-01` -> `TASK-05`), one atomic task at a time upon user command.
   - **AI Controls:** Temporarily disable AI controls / display an "Under Development (`Tính năng đang phát triển`)" popup (`TASK-10`).
   - **Localization:** Implement bilingual `VI / EN` support with **Vietnamese (`vi`)** as the default language (`TASK-13`).
2. **Remaining Technical Question — DDT Iteration Isolation vs. Shared Context:**
   - When running a Test Case with multiple `dataTable` rows in `TASK-04`, should each row run as a separate Test Case iteration in the Live Stream and HTML Report (e.g., `TC_01 [Row 1/3]`, `TC_01 [Row 2/3]`), each with its own fresh `BrowserContext`? *(Recommended: Yes, fresh `BrowserContext` per row to maintain 100% session isolation).*

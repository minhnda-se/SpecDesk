# Phase 2: Visual Scenario Studio & Locator Management

## 1. Objectives & Scope

Phase 2 builds the **Visual No-Code / Low-Code Test Authoring Interface**. It enables QA engineers to assemble, customize, and maintain test scenarios, reusable flows, Page Object locators, and Data-Driven datasets directly through an intuitive desktop UI without writing code.

- **Total Estimated Effort**: 5 – 6 Days (1 Senior Frontend / SDET Developer)
- **Prerequisites**: Completion of Phase 1 (File & Watcher Services).

---

## 2. Component Architecture & UI Hierarchy

```text
desktop-app/src/renderer/src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx                # Scenario & Page Explorer
│   │   ├── Header.tsx                 # Mode Toggle (Local/AI) & Project Switcher
│   │   └── TabManager.tsx             # Multi-tab workspace (Scenario, Locator, BDD)
│   ├── scenario-studio/
│   │   ├── ScenarioEditor.tsx         # Main scenario container
│   │   ├── TestCaseCard.tsx           # Test Case details, Preconditions, Steps, Postconditions
│   │   ├── StepItem.tsx               # Drag-and-drop step card
│   │   ├── ActionCatalogDrawer.tsx    # Palette of available actions & assertions
│   │   └── DynamicTokenPicker.tsx     # Popover for {{TIMESTAMP}}, {{UUID}}, etc.
│   ├── locator-pool/
│   │   ├── LocatorManager.tsx         # Page Object visual table
│   │   ├── SelectorInspector.tsx      # CSS / XPath validator & tester
│   │   └── DuplicateChecker.tsx       # Uniqueness & overlap audit
│   ├── ddt-grid/
│   │   ├── DataTableEditor.tsx        # Spreadsheet-like grid for test data rows
│   │   └── CsvImportExportModal.tsx   # CSV <-> JSON scenario synchronizer
│   └── bdd-studio/
│       ├── GherkinEditor.tsx          # Monaco Editor with Gherkin syntax
│       └── TranspileButton.tsx        # Triggers scripts/compile-bdd.ts
```

---

## 3. Detailed Tasks & Specifications

### Task 2.1: Workspace Navigation & Scenario Explorer
- **Objective**: Provide a rich sidebar navigation for all test suites in `data/scenarios/`.
- **Key Features**:
  - Tree-view display of scenarios, flows, and feature files.
  - Search & filter by test name, tags (`@smoke`, `@regression`), or file name.
  - Context menu actions: Create New Suite, Clone Scenario, Rename, Delete to Trash.
- **Acceptance Criteria**:
  - Clicking any scenario opens it in an active tab without UI flicker.

### Task 2.2: Visual Drag-and-Drop Step Builder
- **Objective**: Intuitive step authoring matching `schema/scenario-schema.json` and `ActionCatalog`.
- **Key Features**:
  - Categorized action selector:
    - **UI Actions**: `goto`, `click`, `fill`, `hover`, `press_key`, `select_option`, `check`, `uncheck`, `upload_file`, `scroll_to`, `wait`, `switch_new_tab`, `store_text`, `save_storage_state`.
    - **Assertions**: `verify_visible`, `verify_not_visible`, `verify_text`, `verify_text_contains`, `verify_element_count`, `verify_visual_snapshot`.
    - **API Actions**: `api_get`, `api_post`, `api_delete`.
    - **Flows**: `call_flow` with parameter mapping.
  - Reordering steps via Drag-and-Drop (using `@dnd-kit/core`).
  - Preconditions and Postconditions collapsible accordions.
  - Integrated **Dynamic Token Helper** popover (`{{TIMESTAMP}}`, `{{RANDOM_EMAIL}}`, `{{UUID}}`, `{{DATE_TODAY}}`).
- **Acceptance Criteria**:
  - Modifying steps immediately updates the in-memory state and marks the tab as dirty (`*`).
  - Saving (Ctrl+S) writes the formatted JSON to disk.

### Task 2.3: Locator Pool & Page Object Manager
- **Objective**: Manage all element selectors across pages (`data/locators/*.json`).
- **Key Features**:
  - Page-by-page view (`LoginPage`, `InventoryPage`, `CartPage`).
  - Selector type tags (CSS, XPath, Text, Role).
  - Duplicate detection: Highlights identical selectors registered under different names.
  - Auto-scaffold missing element skeleton button (calls `scripts/generate-locator-todo.ts`).
- **Acceptance Criteria**:
  - Adding a new element key in `LoginPage` makes it immediately selectable in the Step Builder dropdown.

### Task 2.4: Data-Driven Testing (DDT) Spreadsheet Grid
- **Objective**: Visual parameterization for test cases containing `dataTable` arrays.
- **Key Features**:
  - Excel-style editable grid (using `@tanstack/react-table`).
  - Add/delete rows, column auto-mapping with variable interpolations (`{{user}}`, `{{pass}}`).
  - 1-click import from CSV and export to CSV.
- **Acceptance Criteria**:
  - Editing tabular data automatically saves correctly into the `dataTable: [...]` JSON field.

### Task 2.5: BDD Gherkin Studio & Transpiler Integration
- **Objective**: Author tests in standard BDD `.feature` syntax with 1-click compilation to JSON.
- **Key Features**:
  - Monaco Editor configured with Gherkin language keywords (`Feature`, `Scenario`, `Given`, `When`, `Then`, `And`).
  - "Compile to Scenario" action invoking `scripts/compile-bdd.ts` via IPC and opening the resulting JSON file.
- **Acceptance Criteria**:
  - Compilation errors are highlighted with line numbers directly in the Monaco editor gutter.

---

## 4. UI State Model & Data Contract

```typescript
// Zustand Workspace Store
export interface IWorkspaceStore {
  activeTabs: ITab[];
  activeTabId: string | null;
  scenarios: IScenarioFileMeta[];
  locators: Record<string, ILocatorStore>;
  openScenario: (fileName: string) => Promise<void>;
  updateStep: (testIndex: number, stepIndex: number, step: IStep) => void;
  reorderSteps: (testIndex: number, oldIndex: number, newIndex: number) => void;
  saveCurrentTab: () => Promise<void>;
}
```

---

## 5. Verification & Testing Plan

1. **Component Testing (`@testing-library/react`)**:
   - Verify StepItem drag-and-drop reordering updates array indices correctly.
   - Verify Dynamic Token picker inserts `{{RANDOM_EMAIL}}` at cursor position.
2. **End-to-End Visual Verification**:
   - Create a complete checkout test case through the UI -> Save -> Check that JSON matches schema -> Execute test.

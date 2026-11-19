# Playwright Embedded Studio: Master Implementation Plan

This folder contains the complete architecture, technical designs, effort estimations, and execution prompts for building the **Embedded Playwright Studio (All-in-One Standalone Desktop Application)**.

---

## 🎯 Core Product Concept

- **Zero-Prerequisite Installer (`.exe`)**: Encapsulates the Node.js runtime, ActionEngine, Handlers, `playwright-core`, and HTML reporter directly inside the Desktop App.
- **Ultra-Lightweight Workspace Folder**: Target test folders on the user's machine **ONLY contain pure JSON test cases and locators (`data/scenarios/*.json` & `data/locators/*.json`)**. No `node_modules`, no `package.json`, no TypeScript dependencies.
- **Dual-Mode Privacy Architecture**:
  - `🟢 Local Mode`: 100% offline, air-gapped, zero data leakage.
  - `🤖 AI Agent Mode`: Connects to Local LLM (Ollama) or Masked Cloud LLMs for self-healing and test generation.

---

## 📑 Plan Index & Reading Order

| # | Document | Scope & Focus | Estimated Effort |
| :---: | :--- | :--- | :---: |
| **00** | [00_OVERVIEW_AND_ARCHITECTURE.md](./00_OVERVIEW_AND_ARCHITECTURE.md) | High-level system design, Pure JSON Workspace concept, Embedded Engine, Dual-Mode specs. | — |
| **01** | [01_PHASE_1_CORE_AND_FOUNDATION.md](./01_PHASE_1_CORE_AND_FOUNDATION.md) | Standalone App scaffold, Embedded ActionEngine porting, Pure JSON Folder Picker & Watcher. | **3 – 4 Days** |
| **02** | [02_PHASE_2_UI_AND_SCENARIO_BUILDER.md](./02_PHASE_2_UI_AND_SCENARIO_BUILDER.md) | Drag & Drop Step Builder, Locator Pool Manager, DDT Grid, Dynamic Token picker. | **5 – 6 Days** |
| **03** | [03_PHASE_3_EXECUTION_AND_REPORTING.md](./03_PHASE_3_EXECUTION_AND_REPORTING.md) | In-Memory Playwright execution (System Chrome/Edge), Live Step Monitor, Pure JS Reporter. | **3 – 4 Days** |
| **04** | [04_PHASE_4_AI_AGENT_MODE.md](./04_PHASE_4_AI_AGENT_MODE.md) | Local LLM (Ollama), PII Sanitizer, AI Self-Healing Studio, Failure Analysis Agent. | **4 – 5 Days** |
| **05** | [05_PHASE_5_PACKAGING_AND_DISTRIBUTION.md](./05_PHASE_5_PACKAGING_AND_DISTRIBUTION.md) | Single-click `.exe` installer (NSIS), System Chrome auto-detect, Clean VM release audit. | **2 – 3 Days** |
| **—** | [PROMPTS_TASK_EXECUTION_CATALOG.md](./PROMPTS_TASK_EXECUTION_CATALOG.md) | **Catalog of 21 ready-to-run execution prompts** for subagents & developers for all tasks. | — |

---

## ⏱️ Total Project Estimation

- **Total Tasks**: 21 decomposed tasks
- **Total Estimated Effort**: **17 – 22 work days (~3.5 to 4.5 calendar weeks)** for 1 Senior Fullstack SDET.
- **Delivery Strategy**: Phased delivery. Phase 1 + 2 + 3 produces a functional **Embedded Local MVP** in ~2.5 weeks.

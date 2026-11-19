import { create } from 'zustand';
import type {
  IStepProgress,
  ITestRunSummary,
  IEmbeddedRunOptions,
  IScenario,
} from '../../../shared/types';

interface RunnerState {
  selectedScenarioPath: string | null;
  loadedScenario: IScenario | null;
  selectedTestCaseIds: string[];
  channel: 'chrome' | 'msedge' | 'chromium';
  isHeadless: boolean;
  slowMo: number;
  isRunning: boolean;
  currentRunId: string | null;
  progressList: IStepProgress[];
  latestSummary: ITestRunSummary | null;
  selectedFailedStep: IStepProgress | null;

  setSelectedScenarioPath: (path: string | null) => Promise<void>;
  setSelectedTestCaseIds: (ids: string[]) => void;
  toggleTestCaseSelection: (testId: string) => void;
  selectAllTestCases: () => void;
  deselectAllTestCases: () => void;
  loadScenarioDetails: (path: string) => Promise<IScenario | null>;
  retestSingleTestCase: (testId: string) => Promise<string | null>;
  setChannel: (channel: 'chrome' | 'msedge' | 'chromium') => void;
  setIsHeadless: (headless: boolean) => void;
  setSlowMo: (slowMo: number) => void;
  setSelectedFailedStep: (step: IStepProgress | null) => void;
  clearRunState: () => void;
  startRun: (customOptions?: Partial<IEmbeddedRunOptions>) => Promise<string | null>;
  stopRun: () => Promise<boolean>;
  setupRunnerListeners: () => (() => void);
}

export const useRunnerStore = create<RunnerState>((set, get) => ({
  selectedScenarioPath: null,
  loadedScenario: null,
  selectedTestCaseIds: [],
  channel: 'chrome',
  isHeadless: false,
  slowMo: 50,
  isRunning: false,
  currentRunId: null,
  progressList: [],
  latestSummary: null,
  selectedFailedStep: null,

  loadScenarioDetails: async (path: string) => {
    if (!window.electronAPI) return null;
    try {
      const scenario = await window.electronAPI.scenarios.read(path);
      const testIds: string[] = [];
      if (Array.isArray(scenario.testCases)) {
        scenario.testCases.forEach((tc, idx) => {
          testIds.push(tc.testId || `TC_${idx + 1}`);
        });
      } else if (Array.isArray(scenario.steps)) {
        testIds.push('TC_01');
      }

      set({
        loadedScenario: scenario,
        selectedTestCaseIds: testIds,
      });
      return scenario;
    } catch (err) {
      console.error('Failed to load scenario detail:', err);
      set({ loadedScenario: null, selectedTestCaseIds: [] });
      return null;
    }
  },

  setSelectedScenarioPath: async (path) => {
    set({ selectedScenarioPath: path });
    if (path) {
      await get().loadScenarioDetails(path);
    } else {
      set({ loadedScenario: null, selectedTestCaseIds: [] });
    }
  },

  setSelectedTestCaseIds: (selectedTestCaseIds) => set({ selectedTestCaseIds }),

  toggleTestCaseSelection: (testId) => {
    set((state) => {
      const current = state.selectedTestCaseIds;
      if (current.includes(testId)) {
        return { selectedTestCaseIds: current.filter((id) => id !== testId) };
      } else {
        return { selectedTestCaseIds: [...current, testId] };
      }
    });
  },

  selectAllTestCases: () => {
    const { loadedScenario } = get();
    if (!loadedScenario) return;
    const allIds: string[] = [];
    if (Array.isArray(loadedScenario.testCases)) {
      loadedScenario.testCases.forEach((tc: any, idx: number) => {
        allIds.push(tc.testId || `TC_${idx + 1}`);
      });
    } else {
      allIds.push('TC_01');
    }
    set({ selectedTestCaseIds: allIds });
  },

  deselectAllTestCases: () => set({ selectedTestCaseIds: [] }),

  retestSingleTestCase: async (testId) => {
    return get().startRun({ selectedTestCaseIds: [testId] });
  },
  setChannel: (channel) => set({ channel }),
  setIsHeadless: (isHeadless) => set({ isHeadless }),
  setSlowMo: (slowMo) => set({ slowMo }),
  setSelectedFailedStep: (selectedFailedStep) => set({ selectedFailedStep }),

  clearRunState: () => {
    set({
      progressList: [],
      latestSummary: null,
      selectedFailedStep: null,
      currentRunId: null,
      isRunning: false,
    });
  },

  startRun: async (customOptions) => {
    if (!window.electronAPI) return null;

    const { selectedScenarioPath, channel, isHeadless, slowMo, selectedTestCaseIds, loadedScenario } = get();
    const scenarioPath = customOptions?.scenarioPath || selectedScenarioPath;

    if (!scenarioPath && !customOptions?.scenario) {
      alert('Please select a scenario to execute.');
      return null;
    }

    const testCaseIdsToRun =
      customOptions?.selectedTestCaseIds !== undefined
        ? customOptions.selectedTestCaseIds
        : selectedTestCaseIds;

    if (
      testCaseIdsToRun &&
      testCaseIdsToRun.length === 0 &&
      loadedScenario?.testCases &&
      loadedScenario.testCases.length > 0
    ) {
      alert('Please select at least one Test Case to execute.');
      return null;
    }

    set({
      isRunning: true,
      progressList: [],
      latestSummary: null,
      selectedFailedStep: null,
    });

    try {
      const runOptions: IEmbeddedRunOptions = {
        scenarioPath: scenarioPath || undefined,
        channel,
        headless: isHeadless,
        slowMo,
        selectedTestCaseIds:
          testCaseIdsToRun && testCaseIdsToRun.length > 0 ? testCaseIdsToRun : undefined,
        ...customOptions,
      };

      const result = await window.electronAPI.runner.executeScenario(runOptions);
      set({ currentRunId: result.runId });
      return result.runId;
    } catch (err: any) {
      console.error('Failed to start scenario execution:', err);
      set({ isRunning: false });
      alert(`Execution failed: ${err.message}`);
      return null;
    }
  },

  stopRun: async () => {
    if (!window.electronAPI) return false;
    const { currentRunId } = get();
    if (!currentRunId) return false;

    try {
      const success = await window.electronAPI.runner.stop(currentRunId);
      set({ isRunning: false });
      return success;
    } catch (err) {
      console.error('Failed to stop run:', err);
      return false;
    }
  },

  setupRunnerListeners: () => {
    if (!window.electronAPI?.runner) return () => {};

    const unsubStep = window.electronAPI.runner.onStepProgress((progress) => {
      set((state) => {
        // Update or append progress item
        const existingIdx = state.progressList.findIndex(
          (p) => p.stepIndex === progress.stepIndex
        );

        const nextList = [...state.progressList];
        if (existingIdx >= 0) {
          nextList[existingIdx] = progress;
        } else {
          nextList.push(progress);
        }

        return { progressList: nextList };
      });
    });

    const unsubFinished = window.electronAPI.runner.onRunFinished((summary) => {
      set({
        isRunning: false,
        latestSummary: summary,
      });
    });

    return () => {
      unsubStep();
      unsubFinished();
    };
  },
}));

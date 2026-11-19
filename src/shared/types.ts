/**
 * SpecDesk - Universal Shared Type Contracts
 */

export interface IAppInfo {
  version: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  platform: string;
}

export interface IScenarioFileMeta {
  name: string;
  path: string;
  stepCount: number;
  testCaseCount: number;
  testCases?: { testId: string; testName: string; stepCount: number }[];
  tags?: string[];
  lastModified?: number;
}

export interface IStep {
  id?: string;
  name?: string;
  action: string;
  page?: string;
  element?: string;
  url?: string;
  target?: string;
  value?: string;
  variable?: string;
  flow?: string;
  params?: Record<string, any>;
  key?: string;
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
  timeout?: number;
  screenshot?: boolean;
  expect?: string;
  storeAs?: string;
  store_response?: { key: string; variable: string };
  attribute?: string;
  count?: number;
  snapshotName?: string;
  maxDiffPixelRatio?: number;
  status?: number;
  expected_status?: number;
  contentType?: string;
  mockData?: any;
  headers?: Record<string, string>;
  data?: any;
  [key: string]: unknown;
}

export interface IFlowDefinition {
  flowName?: string;
  name?: string;
  description?: string;
  parameters?: string[];
  steps: IStep[];
}

export type IDataRow = Record<string, any>;

export interface ITestCase {
  testId: string;
  name?: string;
  testName?: string;
  description?: string;
  preconditions?: IStep[];
  steps: IStep[];
  postconditions?: IStep[];
  dataTable?: Record<string, unknown>[];
  tags?: string[];
}

export interface IScenario {
  id?: string;
  name?: string;
  scenario?: string;
  description?: string;
  tags?: string[];
  config?: {
    tags?: string[];
    locatorFile?: string;
  };
  testCases?: ITestCase[];
  steps?: IStep[];
  variables?: Record<string, unknown>;
}

export interface ILocatorDef {
  type?: 'css' | 'xpath' | 'role' | 'text' | 'testid' | 'label' | 'placeholder' | string;
  value: string;
  description?: string;
  healedFrom?: string;
}

export interface ILocatorStore {
  [key: string]: any;
}

export interface IEmbeddedRunOptions {
  scenarioPath?: string;
  scenario?: IScenario;
  headless?: boolean;
  channel?: 'chrome' | 'msedge' | 'chromium';
  viewport?: { width: number; height: number };
  slowMo?: number;
  timeout?: number;
  env?: Record<string, string>;
  selectedTestCaseIds?: string[];
  enableAutoHealing?: boolean;
}

export interface IStepProgress {
  runId: string;
  scenarioName?: string;
  testId?: string;
  testName?: string;
  stage?: 'preconditions' | 'steps' | 'postconditions' | string;
  stepIndex: number;
  totalSteps: number;
  action?: string;
  target?: string;
  status: 'running' | 'passed' | 'failed' | 'skipped' | 'healing';
  durationMs?: number;
  error?: string;
  screenshotBase64?: string;
  timestamp: number;
}

export interface ITestRunSummary {
  runId: string;
  scenarioName: string;
  status: 'passed' | 'failed' | 'aborted';
  totalTestCases?: number;
  passedTestCases?: number;
  failedTestCases?: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  durationMs: number;
  reportPath?: string;
  error?: string;
  timestamp: number;
}

export interface IHealRequest {
  elementName: string;
  currentSelector: string;
  pageDomSnippet?: string;
  screenshotBase64?: string;
  errorMessage?: string;
}

export interface IHealResponse {
  elementName: string;
  suggestedSelector: string;
  confidence: number;
  rationale: string;
}

export interface IFailureAnalysisReq {
  runId: string;
  step: IStep;
  errorMessage: string;
  stackTrace?: string;
  screenshotBase64?: string;
}

export interface IFileChangeEvent {
  event: 'add' | 'change' | 'unlink';
  path: string;
  relativePath: string;
  category: 'scenario' | 'locator' | 'flow' | 'other';
}

export interface IElectronAPI {
  app: {
    getInfo: () => Promise<IAppInfo>;
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };
  workspace: {
    selectFolder: () => Promise<{ canceled: boolean; path?: string }>;
    openFolder: (path: string) => Promise<{ success: boolean; path?: string; error?: string }>;
    getRecent: () => Promise<string[]>;
    getActive: () => Promise<string | null>;
    close: () => Promise<{ success: boolean }>;
    removeRecent: (path: string) => Promise<string[]>;
    deleteFolder: (path: string) => Promise<{ success: boolean; error?: string }>;
    importTemplates?: () => Promise<{ success: boolean; importedCount: number; error?: string }>;
    onFileChanged: (callback: (change: IFileChangeEvent) => void) => () => void;
  };
  scenarios: {
    list: () => Promise<IScenarioFileMeta[]>;
    read: (fileName: string) => Promise<IScenario>;
    save: (fileName: string, data: IScenario) => Promise<{ success: boolean; error?: string }>;
    delete: (fileName: string) => Promise<{ success: boolean; error?: string }>;
  };
  locators: {
    list: () => Promise<string[]>;
    read: (fileName: string) => Promise<ILocatorStore>;
    save: (fileName: string, data: ILocatorStore) => Promise<{ success: boolean; error?: string }>;
  };
  runner: {
    executeScenario: (options: IEmbeddedRunOptions) => Promise<{ runId: string }>;
    stop: (runId: string) => Promise<boolean>;
    onStepProgress: (callback: (progress: IStepProgress) => void) => () => void;
    onRunFinished: (callback: (summary: ITestRunSummary) => void) => () => void;
  };
  ai: {
    healLocator: (req: IHealRequest) => Promise<IHealResponse>;
    analyzeFailure: (req: IFailureAnalysisReq) => Promise<string>;
    generateScenario: (prompt: string) => Promise<IScenario>;
  };
  inspector: {
    // Session-based controls
    launchSession: (options: {
      initialUrl?: string;
      targetPage: string;
      locatorFile?: string;
    }) => Promise<{ success: boolean; error?: string; status?: ISessionStatus }>;
    closeSession: () => Promise<void>;
    navigateSession: (url: string) => Promise<{ success: boolean; error?: string }>;
    getSessionStatus: () => Promise<ISessionStatus>;
    scrapeCurrentScreen: () => Promise<{
      success: boolean;
      elements?: IScrapedElement[];
      url?: string;
      title?: string;
      error?: string;
    }>;
    setPickerMode: (options: {
      enabled: boolean;
      targetPage: string;
    }) => Promise<{ success: boolean }>;

    // Events
    onElementCaptured: (callback: (element: ICapturedElement) => void) => () => void;
    onSessionStatusChanged: (callback: (status: ISessionStatus) => void) => () => void;
    onScrapeTriggered: (
      callback: (data: { elements: IScrapedElement[]; url: string; title: string }) => void
    ) => () => void;

    // Backward compatibility
    startPicker: (options: {
      url: string;
      targetPage: string;
      locatorFile?: string;
    }) => Promise<{ success: boolean; error?: string }>;
    stopPicker: () => Promise<void>;
    scrapePage: (
      url: string
    ) => Promise<{ success: boolean; elements?: IScrapedElement[]; error?: string }>;
    onPickerClosed: (callback: () => void) => () => void;
  };
}

export interface ISessionStatus {
  isConnected: boolean;
  currentUrl: string;
  currentTitle: string;
  isPickerActive: boolean;
  targetPage: string;
}

export interface ICapturedElement {
  targetPage: string;
  elementKey: string;
  selector: string;
  tagName: string;
  text?: string;
  placeholder?: string;
  locatorFile?: string;
}

export interface IScrapedElement {
  elementKey: string;
  selector: string;
  tagName: string;
  text?: string;
  placeholder?: string;
  type?: string;
}


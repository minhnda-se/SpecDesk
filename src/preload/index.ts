import { contextBridge, ipcRenderer } from 'electron';
import type {
  IElectronAPI,
  IAppInfo,
  IScenarioFileMeta,
  IScenario,
  ILocatorStore,
  IEmbeddedRunOptions,
  IStepProgress,
  ITestRunSummary,
  IHealRequest,
  IHealResponse,
  IFailureAnalysisReq,
  IFileChangeEvent,
} from '../shared/types.js';

const electronAPI: IElectronAPI = {
  app: {
    getInfo: (): Promise<IAppInfo> => ipcRenderer.invoke('app:getInfo'),
    minimize: (): Promise<void> => ipcRenderer.invoke('app:minimize'),
    maximize: (): Promise<void> => ipcRenderer.invoke('app:maximize'),
    close: (): Promise<void> => ipcRenderer.invoke('app:close'),
  },
  workspace: {
    selectFolder: (): Promise<{ canceled: boolean; path?: string }> =>
      ipcRenderer.invoke('workspace:selectFolder'),
    openFolder: (path: string): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke('workspace:openFolder', path),
    getRecent: (): Promise<string[]> => ipcRenderer.invoke('workspace:getRecent'),
    getActive: (): Promise<string | null> => ipcRenderer.invoke('workspace:getActive'),
    close: (): Promise<{ success: boolean }> => ipcRenderer.invoke('workspace:close'),
    removeRecent: (path: string): Promise<string[]> => ipcRenderer.invoke('workspace:removeRecent', path),
    deleteFolder: (path: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('workspace:deleteFolder', path),
    importTemplates: (): Promise<{ success: boolean; importedCount: number; error?: string }> =>
      ipcRenderer.invoke('workspace:importTemplates'),
    onFileChanged: (callback: (change: IFileChangeEvent) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, change: IFileChangeEvent) => {
        callback(change);
      };
      ipcRenderer.on('workspace:fileChanged', listener);
      return () => {
        ipcRenderer.removeListener('workspace:fileChanged', listener);
      };
    },
  },
  scenarios: {
    list: (): Promise<IScenarioFileMeta[]> => ipcRenderer.invoke('scenarios:list'),
    read: (fileName: string): Promise<IScenario> =>
      ipcRenderer.invoke('scenarios:read', fileName),
    save: (fileName: string, data: IScenario): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('scenarios:save', fileName, data),
    delete: (fileName: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('scenarios:delete', fileName),
  },
  locators: {
    list: (): Promise<string[]> => ipcRenderer.invoke('locators:list'),
    read: (fileName: string): Promise<ILocatorStore> =>
      ipcRenderer.invoke('locators:read', fileName),
    save: (fileName: string, data: ILocatorStore): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('locators:save', fileName, data),
  },
  runner: {
    executeScenario: (options: IEmbeddedRunOptions): Promise<{ runId: string }> =>
      ipcRenderer.invoke('runner:executeScenario', options),
    stop: (runId: string): Promise<boolean> => ipcRenderer.invoke('runner:stop', runId),
    onStepProgress: (callback: (progress: IStepProgress) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, progress: IStepProgress) => {
        callback(progress);
      };
      ipcRenderer.on('runner:stepProgress', listener);
      return () => {
        ipcRenderer.removeListener('runner:stepProgress', listener);
      };
    },
    onRunFinished: (callback: (summary: ITestRunSummary) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, summary: ITestRunSummary) => {
        callback(summary);
      };
      ipcRenderer.on('runner:runFinished', listener);
      return () => {
        ipcRenderer.removeListener('runner:runFinished', listener);
      };
    },
  },
  ai: {
    healLocator: (req: IHealRequest): Promise<IHealResponse> =>
      ipcRenderer.invoke('ai:healLocator', req),
    analyzeFailure: (req: IFailureAnalysisReq): Promise<string> =>
      ipcRenderer.invoke('ai:analyzeFailure', req),
    generateScenario: (prompt: string): Promise<IScenario> =>
      ipcRenderer.invoke('ai:generateScenario', prompt),
  },
  inspector: {
    // Session-based controls
    launchSession: (options: { initialUrl?: string; targetPage: string; locatorFile?: string }) =>
      ipcRenderer.invoke('inspector:launchSession', options),
    closeSession: () => ipcRenderer.invoke('inspector:closeSession'),
    navigateSession: (url: string) => ipcRenderer.invoke('inspector:navigateSession', url),
    getSessionStatus: () => ipcRenderer.invoke('inspector:getSessionStatus'),
    scrapeCurrentScreen: () => ipcRenderer.invoke('inspector:scrapeCurrentScreen'),
    setPickerMode: (options: { enabled: boolean; targetPage: string }) =>
      ipcRenderer.invoke('inspector:setPickerMode', options),

    // Event listeners
    onElementCaptured: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, element: any) => {
        callback(element);
      };
      ipcRenderer.on('inspector:elementCaptured', listener);
      return () => {
        ipcRenderer.removeListener('inspector:elementCaptured', listener);
      };
    },
    onSessionStatusChanged: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, status: any) => {
        callback(status);
      };
      ipcRenderer.on('inspector:sessionStatusChanged', listener);
      return () => {
        ipcRenderer.removeListener('inspector:sessionStatusChanged', listener);
      };
    },
    onScrapeTriggered: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, data: any) => {
        callback(data);
      };
      ipcRenderer.on('inspector:scrapeTriggered', listener);
      return () => {
        ipcRenderer.removeListener('inspector:scrapeTriggered', listener);
      };
    },

    // Backward compatibility
    startPicker: (options: { url: string; targetPage: string; locatorFile?: string }) =>
      ipcRenderer.invoke('inspector:startPicker', options),
    stopPicker: () => ipcRenderer.invoke('inspector:stopPicker'),
    scrapePage: (url: string) => ipcRenderer.invoke('inspector:scrapePage', url),
    onPickerClosed: (callback) => {
      const listener = () => {
        callback();
      };
      ipcRenderer.on('inspector:pickerClosed', listener);
      return () => {
        ipcRenderer.removeListener('inspector:pickerClosed', listener);
      };
    },
  },
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  } catch (error) {
    console.error('Error exposing electronAPI via contextBridge:', error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electronAPI = electronAPI;
}

import { create } from 'zustand';
import type { IAppInfo, IScenarioFileMeta } from '../../../shared/types';

interface WorkspaceState {
  appInfo: IAppInfo | null;
  activeWorkspace: string | null;
  recentWorkspaces: string[];
  scenarios: IScenarioFileMeta[];
  locators: string[];
  isLoading: boolean;
  statusMessage: string;
  setAppInfo: (info: IAppInfo) => void;
  setActiveWorkspace: (path: string | null) => void;
  setRecentWorkspaces: (recents: string[]) => void;
  setStatusMessage: (msg: string) => void;
  setIsLoading: (loading: boolean) => void;
  loadInitialState: () => Promise<void>;
  selectWorkspaceFolder: () => Promise<string | null>;
  openWorkspaceFolder: (folderPath: string) => Promise<boolean>;
  closeWorkspace: () => Promise<void>;
  removeRecentWorkspace: (folderPath: string) => Promise<void>;
  deleteWorkspaceFolder: (folderPath: string) => Promise<boolean>;
  importTemplates: () => Promise<{ success: boolean; importedCount: number; error?: string }>;
  loadScenarios: () => Promise<void>;
  loadLocators: () => Promise<void>;
  setupWatcherListener: () => (() => void) | undefined;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  appInfo: null,
  activeWorkspace: null,
  recentWorkspaces: [],
  scenarios: [],
  locators: [],
  isLoading: false,
  statusMessage: 'Ready',

  setAppInfo: (appInfo) => set({ appInfo }),
  setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),
  setRecentWorkspaces: (recentWorkspaces) => set({ recentWorkspaces }),
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  setIsLoading: (isLoading) => set({ isLoading }),

  loadInitialState: async () => {
    if (!window.electronAPI) return;
    try {
      const [info, active, recents] = await Promise.all([
        window.electronAPI.app.getInfo(),
        window.electronAPI.workspace.getActive(),
        window.electronAPI.workspace.getRecent(),
      ]);
      set({ appInfo: info, activeWorkspace: active, recentWorkspaces: recents });
      if (active) {
        await Promise.all([get().loadScenarios(), get().loadLocators()]);
      }
    } catch (err) {
      console.error('Failed to load initial workspace state:', err);
    }
  },

  loadScenarios: async () => {
    if (!window.electronAPI) return;
    try {
      const list = await window.electronAPI.scenarios.list();
      set({ scenarios: list });
    } catch (err) {
      console.error('Failed to list scenarios:', err);
    }
  },

  loadLocators: async () => {
    if (!window.electronAPI) return;
    try {
      const list = await window.electronAPI.locators.list();
      set({ locators: list });
    } catch (err) {
      console.error('Failed to list locators:', err);
    }
  },

  selectWorkspaceFolder: async () => {
    if (!window.electronAPI) {
      set({ statusMessage: 'Electron API unavailable (Browser preview)' });
      return null;
    }

    set({ isLoading: true, statusMessage: 'Selecting workspace folder...' });
    try {
      const result = await window.electronAPI.workspace.selectFolder();
      if (!result.canceled && result.path) {
        const recents = await window.electronAPI.workspace.getRecent();
        set({
          activeWorkspace: result.path,
          recentWorkspaces: recents,
          statusMessage: `Connected to workspace: ${result.path}`,
          isLoading: false,
        });
        await Promise.all([get().loadScenarios(), get().loadLocators()]);
        return result.path;
      }
      set({ statusMessage: 'Folder selection canceled', isLoading: false });
      return null;
    } catch (err) {
      set({
        statusMessage: `Error: ${(err as Error).message}`,
        isLoading: false,
      });
      return null;
    }
  },

  openWorkspaceFolder: async (folderPath: string) => {
    if (!window.electronAPI) return false;

    set({ isLoading: true, statusMessage: `Opening workspace: ${folderPath}...` });
    try {
      const result = await window.electronAPI.workspace.openFolder(folderPath);
      if (result.success && result.path) {
        const recents = await window.electronAPI.workspace.getRecent();
        set({
          activeWorkspace: result.path,
          recentWorkspaces: recents,
          statusMessage: `Connected to workspace: ${result.path}`,
          isLoading: false,
        });
        await Promise.all([get().loadScenarios(), get().loadLocators()]);
        return true;
      } else {
        set({
          statusMessage: `Failed to open workspace: ${result.error || 'Unknown error'}`,
          isLoading: false,
        });
        return false;
      }
    } catch (err) {
      set({
        statusMessage: `Error: ${(err as Error).message}`,
        isLoading: false,
      });
      return false;
    }
  },

  closeWorkspace: async () => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.workspace.close();
      set({
        activeWorkspace: null,
        scenarios: [],
        locators: [],
        statusMessage: 'Workspace closed',
      });
    } catch (err) {
      console.error('Failed to close workspace:', err);
    }
  },

  removeRecentWorkspace: async (folderPath: string) => {
    if (!window.electronAPI) return;
    try {
      const recents = await window.electronAPI.workspace.removeRecent(folderPath);
      set({ recentWorkspaces: recents });
    } catch (err) {
      console.error('Failed to remove recent workspace:', err);
    }
  },

  deleteWorkspaceFolder: async (folderPath: string) => {
    if (!window.electronAPI) return false;
    try {
      const result = await window.electronAPI.workspace.deleteFolder(folderPath);
      if (result.success) {
        const recents = await window.electronAPI.workspace.getRecent();
        const wasActive = get().activeWorkspace === folderPath;
        set({
          recentWorkspaces: recents,
          activeWorkspace: wasActive ? null : get().activeWorkspace,
          scenarios: wasActive ? [] : get().scenarios,
          locators: wasActive ? [] : get().locators,
          statusMessage: `Deleted workspace folder: ${folderPath}`,
        });
        return true;
      }
      set({ statusMessage: `Delete failed: ${result.error}` });
      return false;
    } catch (err) {
      set({ statusMessage: `Delete error: ${(err as Error).message}` });
      return false;
    }
  },

  importTemplates: async () => {
    if (!window.electronAPI?.workspace?.importTemplates) {
      return { success: false, importedCount: 0 };
    }
    set({ isLoading: true, statusMessage: 'Importing starter templates...' });
    try {
      const res = await window.electronAPI.workspace.importTemplates();
      if (res.success) {
        set({ statusMessage: `Imported ${res.importedCount} sample files.` });
        await Promise.all([get().loadScenarios(), get().loadLocators()]);
      } else {
        set({ statusMessage: `Template import failed: ${res.error}` });
      }
      set({ isLoading: false });
      return res;
    } catch (err: any) {
      set({ statusMessage: `Error: ${err.message}`, isLoading: false });
      return { success: false, importedCount: 0 };
    }
  },

  setupWatcherListener: () => {
    if (!window.electronAPI?.workspace?.onFileChanged) return undefined;

    return window.electronAPI.workspace.onFileChanged((change) => {
      console.log('[WorkspaceStore] Received file change notification:', change);
      set({ statusMessage: `File ${change.event}: ${change.relativePath}` });

      if (change.category === 'scenario') {
        get().loadScenarios();
      } else if (change.category === 'locator') {
        get().loadLocators();
      } else {
        get().loadScenarios();
        get().loadLocators();
      }
    });
  },
}));

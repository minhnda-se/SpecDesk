import { create } from 'zustand';
import type { IScenario, ILocatorStore } from '../../../shared/types';

export interface ITab {
  id: string;
  type: 'scenario' | 'locator';
  title: string;
  fileName: string;
  isDirty: boolean;
  data: any;
}

interface TabState {
  tabs: ITab[];
  activeTabId: string | null;
  openTab: (type: 'scenario' | 'locator', fileName: string, data?: any) => Promise<void>;
  closeTab: (tabId: string) => void;
  setActiveTabId: (tabId: string) => void;
  updateActiveData: (updater: (prevData: any) => any) => void;
  saveActiveTab: () => Promise<boolean>;
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTab: async (type, fileName, providedData) => {
    const tabId = `${type}:${fileName}`;
    const existing = get().tabs.find((t) => t.id === tabId);

    if (existing) {
      set({ activeTabId: tabId });
      return;
    }

    let loadedData = providedData;
    if (!loadedData && window.electronAPI) {
      try {
        if (type === 'scenario') {
          loadedData = await window.electronAPI.scenarios.read(fileName);
        } else {
          loadedData = await window.electronAPI.locators.read(fileName);
        }
      } catch (err) {
        console.error(`Failed to read ${type} file ${fileName}:`, err);
        return;
      }
    }

    const newTab: ITab = {
      id: tabId,
      type,
      title: fileName.replace(/\.json$/, ''),
      fileName,
      isDirty: false,
      data: loadedData || (type === 'scenario' ? { name: fileName, steps: [] } : {}),
    };

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: tabId,
    }));
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    const tabToClose = tabs.find((t) => t.id === tabId);

    if (tabToClose?.isDirty) {
      const confirmClose = window.confirm(
        `"${tabToClose.title}" has unsaved changes. Are you sure you want to close it?`
      );
      if (!confirmClose) return;
    }

    const nextTabs = tabs.filter((t) => t.id !== tabId);
    let nextActiveId = activeTabId;

    if (activeTabId === tabId) {
      const idx = tabs.findIndex((t) => t.id === tabId);
      if (nextTabs.length > 0) {
        nextActiveId = nextTabs[Math.max(0, idx - 1)].id;
      } else {
        nextActiveId = null;
      }
    }

    set({
      tabs: nextTabs,
      activeTabId: nextActiveId,
    });
  },

  setActiveTabId: (tabId) => {
    set({ activeTabId: tabId });
  },

  updateActiveData: (updater) => {
    const { tabs, activeTabId } = get();
    if (!activeTabId) return;

    set({
      tabs: tabs.map((tab) => {
        if (tab.id === activeTabId) {
          const updated = updater(tab.data);
          return {
            ...tab,
            data: updated,
            isDirty: true,
          };
        }
        return tab;
      }),
    });
  },

  saveActiveTab: async () => {
    const { tabs, activeTabId } = get();
    if (!activeTabId || !window.electronAPI) return false;

    const currentTab = tabs.find((t) => t.id === activeTabId);
    if (!currentTab) return false;

    try {
      if (currentTab.type === 'scenario') {
        const res = await window.electronAPI.scenarios.save(
          currentTab.fileName,
          currentTab.data as IScenario
        );
        if (!res.success) throw new Error(res.error || 'Save failed');
      } else {
        const res = await window.electronAPI.locators.save(
          currentTab.fileName,
          currentTab.data as ILocatorStore
        );
        if (!res.success) throw new Error(res.error || 'Save failed');
      }

      set({
        tabs: tabs.map((t) => (t.id === activeTabId ? { ...t, isDirty: false } : t)),
      });
      return true;
    } catch (err) {
      console.error(`Error saving tab ${currentTab.id}:`, err);
      alert(`Save failed: ${(err as Error).message}`);
      return false;
    }
  },
}));

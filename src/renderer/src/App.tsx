import { useEffect, useState } from 'react';
import {
  FolderOpen,
  Play,
  Layers,
  Sparkles,
  ShieldCheck,
  Terminal,
  Cpu,
  FileCode2,
  Boxes,
  ChevronRight,
  FolderGit2,
  RefreshCw,
  FolderPlus,
  Trash2,
  X,
  LogOut,
} from 'lucide-react';
import { useWorkspaceStore } from './stores/workspace.store';
import { useTabStore } from './stores/tab.store';
import { ScenarioStudio } from './components/scenario-studio/ScenarioStudio';
import { LocatorPoolStudio } from './components/locator-pool/LocatorPoolStudio';
import { RunnerStudio } from './components/runner-monitor/RunnerStudio';

export default function App() {
  const {
    appInfo,
    activeWorkspace,
    recentWorkspaces,
    scenarios,
    locators,
    isLoading,
    statusMessage,
    loadInitialState,
    selectWorkspaceFolder,
    openWorkspaceFolder,
    closeWorkspace,
    removeRecentWorkspace,
    deleteWorkspaceFolder,
    setupWatcherListener,
  } = useWorkspaceStore();

  const [activeTab, setActiveTab] = useState<'workspace' | 'scenarios' | 'locators' | 'runner' | 'ai'>('workspace');
  const [appMode, setAppMode] = useState<'local' | 'ai'>('local');

  useEffect(() => {
    loadInitialState();
    const unsubscribe = setupWatcherListener();
    return () => {
      unsubscribe?.();
    };
  }, [loadInitialState, setupWatcherListener]);

  // Global Ctrl+S / Cmd+S save hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        useTabStore.getState().saveActiveTab();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090d16] text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Custom Titlebar */}
      <header className="h-10 bg-[#0c1222] border-b border-slate-800/80 flex items-center justify-between px-3 titlebar-drag z-50">
        <div className="flex items-center space-x-2.5 titlebar-no-drag">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Play className="w-3 h-3 text-slate-950 fill-slate-950 translate-x-[0.5px]" />
          </div>
          <span className="font-semibold text-xs tracking-wider uppercase text-slate-200">
            Playwright <span className="text-emerald-400 font-bold">Embedded Studio</span>
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
            v1.0.0-standalone
          </span>
        </div>

        {/* Center Mode Switcher & Workspace Info */}
        <div className="flex items-center space-x-3 titlebar-no-drag">
          {/* Dual-Mode Toggle */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 text-[11px]">
            <button
              onClick={() => setAppMode('local')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center space-x-1.5 ${
                appMode === 'local'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Local Air-Gapped</span>
            </button>
            <button
              onClick={() => setAppMode('ai')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center space-x-1.5 ${
                appMode === 'ai'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>AI Agent Mode</span>
            </button>
          </div>
        </div>

        {/* Right Status */}
        <div className="flex items-center space-x-3 pr-28 titlebar-no-drag">
          {activeWorkspace && (
            <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-0.5">
              <span
                className="text-[11px] font-mono text-slate-300 max-w-[180px] truncate"
                title={activeWorkspace}
              >
                {activeWorkspace.split(/[\\/]/).pop()}
              </span>
              <button
                type="button"
                onClick={() => closeWorkspace()}
                title="Close Active Workspace"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer flex items-center space-x-1 text-[10px]"
              >
                <LogOut className="w-3 h-3" />
                <span>Close</span>
              </button>
            </div>
          )}
          <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-[10px]">In-Memory Engine Ready</span>
          </div>
        </div>
      </header>

      {/* Main App Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Navigation */}
        <aside className="w-16 bg-[#0a0f1d] border-r border-slate-800/80 flex flex-col items-center py-4 space-y-3">
          <button
            title="Workspace Explorer"
            onClick={() => setActiveTab('workspace')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'workspace'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FolderOpen className="w-5 h-5" />
          </button>
          <button
            title="Scenarios & Tests"
            onClick={() => setActiveTab('scenarios')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'scenarios'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileCode2 className="w-5 h-5" />
          </button>
          <button
            title="Locator Pool"
            onClick={() => setActiveTab('locators')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'locators'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-5 h-5" />
          </button>
          <button
            title="Execution Runner"
            onClick={() => setActiveTab('runner')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'runner'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Terminal className="w-5 h-5" />
          </button>
          <button
            title="AI Self-Healing & Studio"
            onClick={() => setActiveTab('ai')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'ai'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <button
            title="Security & Sandbox Status"
            className="w-10 h-10 rounded-xl text-slate-500 hover:text-emerald-400 hover:bg-slate-800/40 flex items-center justify-center transition-all"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-400/80" />
          </button>
        </aside>

        {activeTab === 'scenarios' ? (
          <ScenarioStudio />
        ) : activeTab === 'locators' ? (
          <LocatorPoolStudio />
        ) : activeTab === 'runner' ? (
          <RunnerStudio />
        ) : activeTab === 'ai' ? (
          <section className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-gradient-to-b from-[#090d16] via-[#0b101e] to-[#090d16]">
            <div className="w-16 h-16 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-200">AI Self-Healing & Agent Studio</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Local Ollama and privacy-masked AI agent for automatic selector healing and failure analysis (Phase 4).
              </p>
            </div>
          </section>
        ) : (
          /* Center Workspace & Welcome Dashboard */
          <section className="flex-1 overflow-y-auto p-8 space-y-8 bg-gradient-to-b from-[#090d16] via-[#0b101e] to-[#090d16]">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Hero Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Zero-Prerequisite Standalone Automation Studio</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  Playwright Embedded Studio
                </h1>
                <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
                  Design, manage, and execute low-code Playwright test suites directly from pure JSON workspaces.
                  Zero <code className="text-emerald-400">node_modules</code>, zero local compilers, and 100% air-gapped execution capability.
                </p>
              </div>

              <button
                onClick={selectWorkspaceFolder}
                disabled={isLoading}
                className="flex items-center space-x-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95 text-sm cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 text-slate-950 animate-spin" />
                ) : (
                  <FolderOpen className="w-4 h-4 text-slate-950" />
                )}
                <span>{isLoading ? 'Opening...' : 'Open Pure JSON Folder'}</span>
              </button>
            </div>

            {/* Active Workspace Banner */}
            {activeWorkspace ? (
              <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 backdrop-blur-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                        Active Workspace Connected
                      </div>
                      <div className="text-sm font-mono text-slate-200 truncate max-w-xl">
                        {activeWorkspace}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={selectWorkspaceFolder}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                    >
                      Change Folder
                    </button>
                    <button
                      onClick={() => closeWorkspace()}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700 hover:border-amber-500/40 transition-colors cursor-pointer flex items-center space-x-1"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Close Workspace</span>
                    </button>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `Are you sure you want to permanently delete workspace "${activeWorkspace}" from disk? This will delete all files inside and cannot be undone!`
                          )
                        ) {
                          deleteWorkspaceFolder(activeWorkspace);
                        }
                      }}
                      className="px-2.5 py-1.5 text-xs font-medium bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 rounded-lg border border-rose-500/30 hover:border-rose-500 transition-colors cursor-pointer flex items-center space-x-1"
                      title="Permanently delete this workspace folder from disk"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Folder</span>
                    </button>
                  </div>
                </div>

                {/* Workspace Statistics Badges */}
                <div className="flex items-center space-x-3 pt-1 text-xs">
                  <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-slate-300">
                    <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span><strong className="text-emerald-400 font-mono">{scenarios.length}</strong> Scenarios</span>
                  </div>
                  <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-slate-300">
                    <Layers className="w-3.5 h-3.5 text-teal-400" />
                    <span><strong className="text-teal-400 font-mono">{locators.length}</strong> Locator Files</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400">
                    <FolderPlus className="w-6 h-6 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-200">No workspace selected</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Select any folder containing your test cases or scenarios (<code className="text-emerald-400">*.json</code>, <code className="text-emerald-400">tc/</code>, <code className="text-emerald-400">scenarios/</code>).
                    </p>
                  </div>
                </div>
                <button
                  onClick={selectWorkspaceFolder}
                  className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors flex items-center space-x-2 cursor-pointer"
                >
                  <span>Select Folder</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Architecture Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-5 rounded-xl bg-[#0e1424] border border-slate-800/90 hover:border-slate-700 transition-all space-y-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-100">In-Memory Execution</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Embedded <code className="text-blue-400">playwright-core</code> and ActionEngine execute scenarios directly without spawning external CLI shells.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#0e1424] border border-slate-800/90 hover:border-slate-700 transition-all space-y-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <FileCode2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-100">Pure JSON Workspaces</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Target folders contain only JSON assets (~50KB). Zero <code className="text-emerald-400">node_modules</code> or compiler baggage required.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#0e1424] border border-slate-800/90 hover:border-slate-700 transition-all space-y-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-100">Hardened Security</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Main process runs with <code className="text-purple-400">contextIsolation</code>, <code className="text-purple-400">sandbox: true</code>, and safe IPC preload bridge.
                </p>
              </div>
            </div>

            {/* Recent Workspaces List */}
            {recentWorkspaces.length > 0 && (
              <div className="space-y-3 pt-4">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Recent Workspaces
                </div>
                <div className="space-y-2">
                  {recentWorkspaces.map((folder, idx) => (
                    <div
                      key={idx}
                      className="group p-3 rounded-lg bg-[#0e1424]/60 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                    >
                      <div
                        onClick={() => openWorkspaceFolder(folder)}
                        className="flex items-center space-x-2.5 font-mono text-slate-300 truncate cursor-pointer flex-1 mr-3"
                      >
                        <FolderGit2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate hover:text-emerald-300">{folder}</span>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openWorkspaceFolder(folder)}
                          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          Switch
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRecentWorkspace(folder);
                          }}
                          title="Remove from recents list"
                          className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              window.confirm(
                                `Are you sure you want to permanently delete folder "${folder}" from disk? This cannot be undone!`
                              )
                            ) {
                              deleteWorkspaceFolder(folder);
                            }
                          }}
                          title="Permanently delete folder from disk"
                          className="p-1 rounded hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
      </main>

      {/* Bottom Status Bar */}
      <footer className="h-7 bg-[#080c14] border-t border-slate-800/80 flex items-center justify-between px-3 text-[11px] text-slate-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-slate-300 font-medium">{statusMessage}</span>
          </div>
          {activeWorkspace && (
            <span className="text-slate-500 font-mono text-[10px] truncate max-w-xs">
              {activeWorkspace}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-4 font-mono text-[10px] text-slate-500">
          <span>Electron: <strong className="text-slate-400">{appInfo?.electronVersion || '34.2.0'}</strong></span>
          <span>Chrome: <strong className="text-slate-400">{appInfo?.chromeVersion || '132.0.6834.196'}</strong></span>
          <span>Node: <strong className="text-slate-400">{appInfo?.nodeVersion || '22.13.0'}</strong></span>
        </div>
      </footer>
    </div>
  );
}

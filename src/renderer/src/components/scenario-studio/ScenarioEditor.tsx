import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Save,
  BookOpen,
  Tag,
  FileCode2,
  Table2,
  ListOrdered,
  Play,
  Copy,
  Trash2,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import type { IScenario, IStep, ITestCase } from '../../../../shared/types';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useTabStore, type ITab } from '../../stores/tab.store';
import { useRunnerStore } from '../../stores/runner.store';
import { StepItem, LocatorItemMeta, LocatorMapData } from './StepItem';
import { ActionCatalogDrawer } from './ActionCatalogDrawer';
import { DataTableEditor } from '../ddt-grid/DataTableEditor';

interface ScenarioEditorProps {
  tab: ITab;
  availablePages?: string[];
  locatorMap?: LocatorMapData;
}

export function ScenarioEditor({ tab }: ScenarioEditorProps) {
  const { locators: locatorFiles } = useWorkspaceStore();
  const { updateActiveData, saveActiveTab } = useTabStore();
  const scenario = (tab.data || {}) as IScenario;

  // Locator Repository Binding
  const boundLocatorFile = scenario.config?.locatorFile || '';
  const hasLocatorRepo = Boolean(boundLocatorFile && boundLocatorFile.trim().length > 0);
  const [scopedLocatorMap, setScopedLocatorMap] = useState<Record<string, LocatorItemMeta[]>>({});

  useEffect(() => {
    let isCancelled = false;
    async function loadBoundLocators() {
      if (!boundLocatorFile || !window.electronAPI) {
        setScopedLocatorMap({});
        return;
      }
      try {
        const content = await window.electronAPI.locators.read(boundLocatorFile);
        if (isCancelled) return;
        const map: Record<string, LocatorItemMeta[]> = {};
        for (const [pageOrEl, val] of Object.entries(content || {})) {
          if (typeof val === 'object' && val !== null && !('value' in val)) {
            // Nested page: val is Record<string, any>
            const items: LocatorItemMeta[] = [];
            for (const [elKey, elVal] of Object.entries(val as Record<string, any>)) {
              if (typeof elVal === 'string') {
                items.push({ name: elKey, selector: elVal });
              } else if (typeof elVal === 'object' && elVal !== null) {
                items.push({
                  name: elKey,
                  selector: elVal.value || '',
                  type: elVal.type,
                });
              } else {
                items.push({ name: elKey, selector: String(elVal || '') });
              }
            }
            map[pageOrEl] = items;
          } else {
            // Flat page: pageOrEl is element key
            const basePage = boundLocatorFile.replace(/\.json$/, '');
            if (!map[basePage]) map[basePage] = [];
            let selector = '';
            let type: string | undefined;
            if (typeof val === 'string') {
              selector = val;
            } else if (typeof val === 'object' && val !== null) {
              selector = (val as any).value || '';
              type = (val as any).type;
            }
            map[basePage].push({ name: pageOrEl, selector, type });
          }
        }
        setScopedLocatorMap(map);
      } catch (err) {
        console.warn(`Failed loading bound locator file ${boundLocatorFile}:`, err);
        if (!isCancelled) setScopedLocatorMap({});
      }
    }

    loadBoundLocators();
    return () => {
      isCancelled = true;
    };
  }, [boundLocatorFile]);

  const effectivePages = useMemo(() => Object.keys(scopedLocatorMap), [scopedLocatorMap]);
  const effectiveLocatorMap = scopedLocatorMap;

  const handleSelectLocatorFile = (fileName: string) => {
    updateActiveData((prev: IScenario) => ({
      ...prev,
      config: {
        ...(prev.config || {}),
        locatorFile: fileName,
      },
    }));
  };

  // Detect whether this scenario uses multi-testcase structure
  const hasTestCases = Array.isArray(scenario.testCases) && scenario.testCases.length > 0;
  const testCases: ITestCase[] = hasTestCases ? scenario.testCases! : [];

  const [selectedTcIndex, setSelectedTcIndex] = useState<number>(0);
  const [activeSubTab, setActiveSubTab] = useState<'steps' | 'ddt'>('steps');
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Active test case resolution
  const activeTcIndex = Math.min(Math.max(0, selectedTcIndex), Math.max(0, testCases.length - 1));
  const currentTestCase: ITestCase | null = hasTestCases ? testCases[activeTcIndex] : null;

  // Active steps list
  const steps: IStep[] = hasTestCases
    ? (currentTestCase?.steps || [])
    : Array.isArray(scenario.steps)
    ? scenario.steps
    : [];

  const scenarioDisplayName =
    scenario.name || scenario.scenario || tab.fileName.replace(/\.json$/, '');

  // --- Step Handlers ---

  const handleAddStep = (partialStep: Partial<IStep> = {}) => {
    const newStep: IStep = {
      action: partialStep.action || 'goto',
      url: partialStep.url || '',
      page: partialStep.page || '',
      element: partialStep.element || '',
      data: partialStep.data || '',
      ...partialStep,
    };

    updateActiveData((prev: IScenario) => {
      if (Array.isArray(prev.testCases) && prev.testCases.length > 0) {
        const nextTestCases = [...prev.testCases];
        const tc = { ...nextTestCases[activeTcIndex] };
        tc.steps = [...(tc.steps || []), newStep];
        nextTestCases[activeTcIndex] = tc;
        return { ...prev, testCases: nextTestCases };
      } else {
        return {
          ...prev,
          steps: [...(prev.steps || []), newStep],
        };
      }
    });
  };

  const handleUpdateStep = (index: number, updated: IStep) => {
    updateActiveData((prev: IScenario) => {
      if (Array.isArray(prev.testCases) && prev.testCases.length > 0) {
        const nextTestCases = [...prev.testCases];
        const tc = { ...nextTestCases[activeTcIndex] };
        const nextSteps = [...(tc.steps || [])];
        nextSteps[index] = updated;
        tc.steps = nextSteps;
        nextTestCases[activeTcIndex] = tc;
        return { ...prev, testCases: nextTestCases };
      } else {
        const nextSteps = [...(prev.steps || [])];
        nextSteps[index] = updated;
        return { ...prev, steps: nextSteps };
      }
    });
  };

  const handleCloneStep = (index: number) => {
    updateActiveData((prev: IScenario) => {
      if (Array.isArray(prev.testCases) && prev.testCases.length > 0) {
        const nextTestCases = [...prev.testCases];
        const tc = { ...nextTestCases[activeTcIndex] };
        const nextSteps = [...(tc.steps || [])];
        const cloned = JSON.parse(JSON.stringify(nextSteps[index]));
        nextSteps.splice(index + 1, 0, cloned);
        tc.steps = nextSteps;
        nextTestCases[activeTcIndex] = tc;
        return { ...prev, testCases: nextTestCases };
      } else {
        const nextSteps = [...(prev.steps || [])];
        const cloned = JSON.parse(JSON.stringify(nextSteps[index]));
        nextSteps.splice(index + 1, 0, cloned);
        return { ...prev, steps: nextSteps };
      }
    });
  };

  const handleDeleteStep = (index: number) => {
    updateActiveData((prev: IScenario) => {
      if (Array.isArray(prev.testCases) && prev.testCases.length > 0) {
        const nextTestCases = [...prev.testCases];
        const tc = { ...nextTestCases[activeTcIndex] };
        tc.steps = (tc.steps || []).filter((_, i) => i !== index);
        nextTestCases[activeTcIndex] = tc;
        return { ...prev, testCases: nextTestCases };
      } else {
        const nextSteps = (prev.steps || []).filter((_, i) => i !== index);
        return { ...prev, steps: nextSteps };
      }
    });
  };

  const handleMoveStep = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= steps.length) return;
    updateActiveData((prev: IScenario) => {
      if (Array.isArray(prev.testCases) && prev.testCases.length > 0) {
        const nextTestCases = [...prev.testCases];
        const tc = { ...nextTestCases[activeTcIndex] };
        const nextSteps = [...(tc.steps || [])];
        const [moved] = nextSteps.splice(fromIndex, 1);
        nextSteps.splice(toIndex, 0, moved);
        tc.steps = nextSteps;
        nextTestCases[activeTcIndex] = tc;
        return { ...prev, testCases: nextTestCases };
      } else {
        const nextSteps = [...(prev.steps || [])];
        const [moved] = nextSteps.splice(fromIndex, 1);
        nextSteps.splice(toIndex, 0, moved);
        return { ...prev, steps: nextSteps };
      }
    });
  };

  // --- Test Case Handlers ---

  const handleAddTestCase = () => {
    updateActiveData((prev: IScenario) => {
      const existingTcs = Array.isArray(prev.testCases) ? [...prev.testCases] : [];
      const count = existingTcs.length + 1;
      const numStr = count < 10 ? `0${count}` : `${count}`;
      const newTc: ITestCase = {
        testId: `TC_${numStr}`,
        testName: `New Test Case ${count}`,
        steps: [
          {
            action: 'goto',
            data: 'https://example.com',
          },
        ],
      };
      return {
        ...prev,
        testCases: [...existingTcs, newTc],
      };
    });
    setSelectedTcIndex(testCases.length);
  };

  const handleDuplicateTestCase = (idx: number) => {
    updateActiveData((prev: IScenario) => {
      if (!Array.isArray(prev.testCases)) return prev;
      const nextTestCases = [...prev.testCases];
      const cloned = JSON.parse(JSON.stringify(nextTestCases[idx]));
      cloned.testId = `${cloned.testId}_copy`;
      cloned.testName = `${cloned.testName || cloned.name || 'Test Case'} (Copy)`;
      nextTestCases.splice(idx + 1, 0, cloned);
      return { ...prev, testCases: nextTestCases };
    });
    setSelectedTcIndex(idx + 1);
  };

  const handleDeleteTestCase = (idx: number) => {
    if (testCases.length <= 1) {
      alert('A scenario suite must have at least one test case.');
      return;
    }
    const tcToDelete = testCases[idx];
    const confirm = window.confirm(
      `Delete test case "${tcToDelete.testId}: ${tcToDelete.testName || tcToDelete.name || ''}"?`
    );
    if (!confirm) return;

    updateActiveData((prev: IScenario) => {
      const nextTestCases = (prev.testCases || []).filter((_, i) => i !== idx);
      return { ...prev, testCases: nextTestCases };
    });
    setSelectedTcIndex(Math.max(0, idx - 1));
  };

  const handleUpdateTestCaseMeta = (field: 'testId' | 'testName' | 'description', value: string) => {
    updateActiveData((prev: IScenario) => {
      if (!Array.isArray(prev.testCases)) return prev;
      const nextTestCases = [...prev.testCases];
      nextTestCases[activeTcIndex] = {
        ...nextTestCases[activeTcIndex],
        [field]: value,
      };
      return { ...prev, testCases: nextTestCases };
    });
  };

  // Convert flat scenario to multi-testcase format
  const handleConvertToTestCases = () => {
    updateActiveData((prev: IScenario) => {
      const initialTc: ITestCase = {
        testId: 'TC_01',
        testName: prev.name || prev.scenario || 'Default Test Case',
        steps: prev.steps || [],
      };
      const copy = { ...prev };
      delete copy.steps;
      return {
        ...copy,
        testCases: [initialTc],
      };
    });
    setSelectedTcIndex(0);
  };

  // --- HTML5 Drag & Drop ---
  const handleDragStart = (_e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, _index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      handleMoveStep(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
  };

  // --- Tag Handlers ---
  const currentTags = scenario.tags || scenario.config?.tags || [];

  const handleAddTag = () => {
    let t = tagInput.trim();
    if (!t) return;
    if (!t.startsWith('@')) t = `@${t}`;
    if (!currentTags.includes(t)) {
      updateActiveData((prev: IScenario) => ({
        ...prev,
        tags: [...currentTags, t],
      }));
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateActiveData((prev: IScenario) => ({
      ...prev,
      tags: currentTags.filter((t) => t !== tagToRemove),
    }));
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#080d19]">
      {/* Top Metadata Header Card */}
      <div className="p-5 rounded-2xl bg-[#0d1424] border border-slate-800 space-y-4 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3 mr-6">
            {/* Scenario Name */}
            <div>
              <div className="flex items-center space-x-2">
                <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Scenario Suite Name
                </label>
                {hasTestCases && (
                  <span className="px-2 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-semibold">
                    {testCases.length} Test Case{testCases.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={scenarioDisplayName}
                onChange={(e) =>
                  updateActiveData((prev: IScenario) => ({
                    ...prev,
                    name: e.target.value,
                    ...(prev.scenario ? { scenario: e.target.value } : {}),
                  }))
                }
                placeholder="Enter scenario name..."
                className="w-full text-lg font-bold text-white bg-transparent border-b border-slate-700/80 focus:border-emerald-500 py-1 outline-none transition-colors"
              />
            </div>

            {/* Scenario Description */}
            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Description
              </label>
              <input
                type="text"
                value={scenario.description || ''}
                onChange={(e) =>
                  updateActiveData((prev: IScenario) => ({ ...prev, description: e.target.value }))
                }
                placeholder="High-level test objective and description..."
                className="w-full text-xs text-slate-300 bg-transparent border-b border-slate-800 focus:border-emerald-500 py-1 outline-none transition-colors"
              />
            </div>

            {/* Bound Locator Repository Selector */}
            <div className="pt-1">
              <div className="flex items-center justify-between pb-1">
                <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-teal-400" />
                  <span>Bound Locator Repository</span>
                </label>
                {hasLocatorRepo && (
                  <span className="text-[10px] text-teal-400 font-mono">
                    {effectivePages.length} Pages • {Object.values(effectiveLocatorMap).reduce((acc, list) => acc + list.length, 0)} Elements
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={boundLocatorFile}
                  onChange={(e) => handleSelectLocatorFile(e.target.value)}
                  className={`w-full max-w-md px-3 py-1.5 rounded-lg text-xs font-mono outline-none border transition-colors cursor-pointer ${
                    hasLocatorRepo
                      ? 'bg-[#090d18] border-teal-500/50 text-teal-300'
                      : 'bg-[#150d12] border-amber-500/60 text-amber-300'
                  }`}
                >
                  <option value="">-- Select Locator Repository (.json) --</option>
                  {locatorFiles.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                {!hasLocatorRepo && (
                  <span className="text-[11px] text-amber-400 font-medium whitespace-nowrap">
                    ⚠️ Required to configure element steps
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons: Run & Save */}
          <div className="flex flex-col items-end space-y-2 shrink-0">
            <div className="flex items-center space-x-2">
              {/* Run Current TC */}
              {hasTestCases && currentTestCase && (
                <button
                  type="button"
                  onClick={async () => {
                    if (tab.isDirty) await saveActiveTab();
                    await useRunnerStore.getState().setSelectedScenarioPath(tab.fileName);
                    useRunnerStore.getState().setSelectedTestCaseIds([currentTestCase.testId]);
                    useRunnerStore.getState().startRun({
                      scenarioPath: tab.fileName,
                      selectedTestCaseIds: [currentTestCase.testId],
                    });
                  }}
                  title={`Run only ${currentTestCase.testId}`}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-700/80 hover:bg-emerald-600 text-emerald-100 border border-emerald-600/40 shadow-md cursor-pointer transition-all"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Run {currentTestCase.testId}</span>
                </button>
              )}

              {/* Run All TCs */}
              <button
                type="button"
                onClick={async () => {
                  if (tab.isDirty) await saveActiveTab();
                  await useRunnerStore.getState().setSelectedScenarioPath(tab.fileName);
                  useRunnerStore.getState().selectAllTestCases();
                  useRunnerStore.getState().startRun({ scenarioPath: tab.fileName });
                }}
                title="Run all test cases in this scenario"
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-600/20 cursor-pointer transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run All</span>
              </button>

              <button
                type="button"
                onClick={() => saveActiveTab()}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all cursor-pointer ${
                  tab.isDirty
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{tab.isDirty ? 'Save Changes' : 'Saved'}</span>
              </button>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              File: {tab.fileName}
            </span>
          </div>
        </div>

        {/* Tags Row */}
        <div className="flex items-center flex-wrap gap-2 pt-1 border-t border-slate-800/80">
          <Tag className="w-3.5 h-3.5 text-slate-500 mr-1" />
          {currentTags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
            >
              <span>{t}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(t)}
                className="hover:text-rose-400 ml-1 cursor-pointer"
              >
                &times;
              </button>
            </span>
          ))}

          <div className="flex items-center space-x-1">
            <input
              type="text"
              placeholder="+ Add tag (@smoke)..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              className="text-xs bg-[#090e1a] border border-slate-700/80 rounded-lg px-2 py-0.5 text-slate-300 placeholder-slate-500 outline-none w-32"
            />
          </div>
        </div>
      </div>

      {/* Warning banner if no locator repository is selected */}
      {!hasLocatorRepo && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs shadow-md">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            <div>
              <p className="font-semibold text-amber-200">No Locator Repository Selected</p>
              <p className="text-[11px] text-amber-400/90">
                Please select a locator repository in the header above. Step element selection is locked until a repository is bound.
              </p>
            </div>
          </div>
          {locatorFiles.length > 0 && (
            <button
              type="button"
              onClick={() => handleSelectLocatorFile(locatorFiles[0])}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer shadow transition-colors"
            >
              Bind &quot;{locatorFiles[0]}&quot;
            </button>
          )}
        </div>
      )}

      {/* Test Cases Strip (if multi-TC or option to convert) */}
      {hasTestCases ? (
        <div className="space-y-3 p-4 rounded-2xl bg-[#0c1222] border border-slate-800/80 shadow-md">
          {/* Test Case Tab Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
              {testCases.map((tc, idx) => {
                const isSelected = activeTcIndex === idx;
                const tcName = tc.testName || tc.name || `Case ${idx + 1}`;
                const stepCount = (tc.steps || []).length;

                return (
                  <button
                    key={tc.testId || idx}
                    type="button"
                    onClick={() => setSelectedTcIndex(idx)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-800/80 border border-transparent'
                    }`}
                  >
                    <span className="font-mono font-bold text-emerald-400">
                      {tc.testId || `TC_${idx + 1}`}
                    </span>
                    <span className="truncate max-w-[140px] text-slate-200">{tcName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                      {stepCount}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleAddTestCase}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-dashed border-emerald-500/30 transition-colors cursor-pointer shrink-0 ml-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Test Case</span>
              </button>
            </div>
          </div>

          {/* Active Test Case Detail Bar */}
          {currentTestCase && (
            <div className="flex items-center justify-between pt-1 gap-4">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    Test ID
                  </label>
                  <input
                    type="text"
                    value={currentTestCase.testId || ''}
                    onChange={(e) => handleUpdateTestCaseMeta('testId', e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-[#090d18] border border-slate-700/80 rounded-lg text-emerald-400 font-mono outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    Test Case Name
                  </label>
                  <input
                    type="text"
                    value={currentTestCase.testName || currentTestCase.name || ''}
                    onChange={(e) => handleUpdateTestCaseMeta('testName', e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-[#090d18] border border-slate-700/80 rounded-lg text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-1 shrink-0 self-end">
                <button
                  type="button"
                  onClick={() => handleDuplicateTestCase(activeTcIndex)}
                  title="Duplicate this test case"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTestCase(activeTcIndex)}
                  title="Delete this test case"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-[#0d1424] border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Single Flat Test Scenario ({steps.length} steps)</span>
          </div>
          <button
            type="button"
            onClick={handleConvertToTestCases}
            className="text-xs text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
          >
            Convert to Multi-TestCase Suite
          </button>
        </div>
      )}

      {/* Sub-Tabs: Test Steps vs Data Table (DDT) */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('steps')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeSubTab === 'steps'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>
              Test Steps ({steps.length})
              {currentTestCase ? ` • ${currentTestCase.testId}` : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ddt')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeSubTab === 'ddt'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>
              Data-Driven Table (
              {(hasTestCases
                ? currentTestCase?.dataTable?.length
                : scenario.testCases?.[0]?.dataTable?.length) || 0}
              )
            </span>
          </button>
        </div>

        {activeSubTab === 'steps' && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsCatalogOpen((prev) => !prev)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isCatalogOpen
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>{isCatalogOpen ? 'Close Catalog' : 'Action Catalog'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddStep()}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold rounded-lg text-xs shadow-md transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Step</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'steps' ? (
        <div className="space-y-3">
          {steps.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                <FileCode2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-300">No test steps added yet</h4>
                <p className="text-xs text-slate-500">
                  Click &quot;Add Step&quot; or open the &quot;Action Catalog&quot; to begin building your test sequence.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleAddStep()}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                Add First Step
              </button>
            </div>
          ) : (
            steps.map((step, idx) => (
              <StepItem
                key={idx}
                index={idx}
                totalSteps={steps.length}
                step={step}
                availablePages={effectivePages}
                locatorMap={effectiveLocatorMap}
                hasLocatorRepo={hasLocatorRepo}
                onUpdateStep={(updated) => handleUpdateStep(idx, updated)}
                onCloneStep={() => handleCloneStep(idx)}
                onDeleteStep={() => handleDeleteStep(idx)}
                onMoveUp={() => handleMoveStep(idx, idx - 1)}
                onMoveDown={() => handleMoveStep(idx, idx + 1)}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            ))
          )}
        </div>
      ) : (
        <DataTableEditor
          dataTable={
            (hasTestCases
              ? currentTestCase?.dataTable
              : scenario.testCases?.[0]?.dataTable) || []
          }
          onChange={(newTable) => {
            updateActiveData((prev: IScenario) => {
              if (Array.isArray(prev.testCases) && prev.testCases.length > 0) {
                const nextTestCases = [...prev.testCases];
                nextTestCases[activeTcIndex] = {
                  ...nextTestCases[activeTcIndex],
                  dataTable: newTable,
                };
                return { ...prev, testCases: nextTestCases };
              } else {
                const testCases = [
                  {
                    testId: 'TC_01',
                    name: prev.name || 'Default Test Case',
                    steps: prev.steps || [],
                    dataTable: newTable,
                  },
                ];
                return { ...prev, testCases };
              }
            });
          }}
        />
      )}

      {/* Action Catalog Drawer */}
      <ActionCatalogDrawer
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onAddStep={handleAddStep}
      />
    </div>
  );
}


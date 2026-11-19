import { useEffect, useState, useMemo } from 'react';
import {
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  FileText,
  AlertTriangle,
  X,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ListFilter,
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useRunnerStore } from '../../stores/runner.store';

export function RunnerStudio() {
  const { scenarios } = useWorkspaceStore();
  const {
    selectedScenarioPath,
    loadedScenario,
    selectedTestCaseIds,
    channel,
    isHeadless,
    isRunning,
    progressList,
    latestSummary,
    selectedFailedStep,
    setSelectedScenarioPath,
    toggleTestCaseSelection,
    selectAllTestCases,
    deselectAllTestCases,
    loadScenarioDetails,
    retestSingleTestCase,
    setChannel,
    setIsHeadless,
    setSelectedFailedStep,
    startRun,
    stopRun,
    setupRunnerListeners,
  } = useRunnerStore();

  const [activeTab, setActiveTab] = useState<'stream' | 'report'>('stream');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  useEffect(() => {
    const unsubscribe = setupRunnerListeners();
    return () => {
      unsubscribe();
    };
  }, [setupRunnerListeners]);

  // If no scenario is selected, auto-select first one
  useEffect(() => {
    if (!selectedScenarioPath && scenarios.length > 0) {
      setSelectedScenarioPath(scenarios[0].path);
    } else if (selectedScenarioPath && !loadedScenario) {
      loadScenarioDetails(selectedScenarioPath);
    }
  }, [selectedScenarioPath, scenarios, setSelectedScenarioPath, loadedScenario, loadScenarioDetails]);

  // Extract scenario test cases summary
  const currentScenarioMeta = scenarios.find((s) => s.path === selectedScenarioPath);

  const testCasesList: { testId: string; testName: string; stepCount: number }[] = useMemo(() => {
    if (loadedScenario?.testCases && loadedScenario.testCases.length > 0) {
      return loadedScenario.testCases.map((tc: any, idx: number) => ({
        testId: tc.testId || `TC_${idx + 1}`,
        testName: tc.testName || tc.name || `Test Case ${idx + 1}`,
        stepCount:
          (tc.preconditions?.length || 0) +
          (tc.steps?.length || 0) +
          (tc.postconditions?.length || 0),
      }));
    }
    if (currentScenarioMeta?.testCases && currentScenarioMeta.testCases.length > 0) {
      return currentScenarioMeta.testCases;
    }
    if (loadedScenario?.steps && loadedScenario.steps.length > 0) {
      return [
        {
          testId: 'TC_01',
          testName: loadedScenario.name || loadedScenario.scenario || 'Main Scenario',
          stepCount: loadedScenario.steps.length,
        },
      ];
    }
    return [];
  }, [loadedScenario, currentScenarioMeta]);

  const totalStepsInSelected = useMemo(() => {
    return testCasesList
      .filter((tc: { testId: string; stepCount: number }) => selectedTestCaseIds.includes(tc.testId))
      .reduce((sum: number, tc: { testId: string; stepCount: number }) => sum + tc.stepCount, 0);
  }, [testCasesList, selectedTestCaseIds]);

  // When run finishes, if report is available, can switch to report view
  useEffect(() => {
    if (latestSummary?.reportPath) {
      // Auto show report button
    }
  }, [latestSummary]);

  const passedCount = progressList.filter((p) => p.status === 'passed').length;
  const failedCount = progressList.filter((p) => p.status === 'failed').length;
  const totalCount = progressList.length > 0 ? progressList[0].totalSteps : 0;
  const percentComplete = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#090d16]">
      {/* Top Execution Control Bar */}
      <header className="p-4 bg-[#0c1222] border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Scenario & Channel Picker */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Scenario:
            </label>
            <select
              value={selectedScenarioPath || ''}
              disabled={isRunning}
              onChange={(e) => setSelectedScenarioPath(e.target.value)}
              className="bg-[#080d1a] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono disabled:opacity-50"
            >
              {scenarios.map((s) => (
                <option key={s.path} value={s.path}>
                  {s.name} ({s.path})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Browser:
            </label>
            <select
              value={channel}
              disabled={isRunning}
              onChange={(e) => setChannel(e.target.value as any)}
              className="bg-[#080d1a] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            >
              <option value="chrome">Google Chrome (System)</option>
              <option value="msedge">Microsoft Edge (System)</option>
              <option value="chromium">Chromium</option>
            </select>
          </div>

          {/* Headless Toggle */}
          <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isHeadless}
              disabled={isRunning}
              onChange={(e) => setIsHeadless(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
            />
            <span>Headless (No GUI)</span>
          </label>
        </div>

        {/* Right: Start / Stop Buttons */}
        <div className="flex items-center space-x-3">
          {isRunning ? (
            <button
              type="button"
              onClick={stopRun}
              className="flex items-center space-x-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-rose-600/30 transition-all cursor-pointer animate-pulse"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Execution</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startRun()}
              disabled={
                scenarios.length === 0 ||
                (testCasesList.length > 0 && selectedTestCaseIds.length === 0)
              }
              className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {testCasesList.length > 0 && selectedTestCaseIds.length < testCasesList.length
                  ? `Run Selected (${selectedTestCaseIds.length}/${testCasesList.length} TCs)`
                  : `Run Test In-Memory (${testCasesList.length || 1} TCs)`}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Test Cases Pre-run Drawer / Selector */}
      {testCasesList.length > 0 && (
        <div className="bg-[#0b1120] border-b border-slate-800/80 px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                <ListFilter className="w-3.5 h-3.5 text-emerald-400" />
                <span>Test Cases ({testCasesList.length})</span>
                {isDrawerOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              <span className="text-xs text-slate-400">
                • <strong className="text-emerald-400 font-mono">{selectedTestCaseIds.length}</strong> of{' '}
                <strong className="text-slate-300 font-mono">{testCasesList.length}</strong> selected (
                {totalStepsInSelected} steps)
              </span>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <button
                type="button"
                onClick={selectAllTestCases}
                disabled={isRunning}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={deselectAllTestCases}
                disabled={isRunning}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Expanded Test Case Checklist */}
          {isDrawerOpen && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {testCasesList.map((tc: { testId: string; testName: string; stepCount: number }) => {
                const isSelected = selectedTestCaseIds.includes(tc.testId);
                return (
                  <div
                    key={tc.testId}
                    onClick={() => !isRunning && toggleTestCaseSelection(tc.testId)}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0f172a] border-emerald-500/40 text-slate-200'
                        : 'bg-[#090d18]/70 border-slate-800/80 text-slate-400 hover:border-slate-700'
                    } ${isRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center space-x-2 truncate pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isRunning}
                        onChange={() => {}}
                        className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                        {tc.testId}
                      </span>
                      <span className="text-xs truncate font-medium" title={tc.testName}>
                        {tc.testName}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[10px] font-mono text-slate-500">
                        {tc.stepCount} steps
                      </span>
                      <button
                        type="button"
                        title={`Run only ${tc.testId}`}
                        disabled={isRunning}
                        onClick={(e) => {
                          e.stopPropagation();
                          retestSingleTestCase(tc.testId);
                        }}
                        className="p-1 rounded hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-400 transition-colors cursor-pointer disabled:opacity-40"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#0a0f1e] border-b border-slate-800/80">
        <div className="p-3 rounded-xl bg-[#0e1526] border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
            Execution Status
          </span>
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning
                  ? 'bg-amber-400 animate-ping'
                  : latestSummary?.status === 'passed'
                  ? 'bg-emerald-400'
                  : latestSummary?.status === 'failed'
                  ? 'bg-rose-400'
                  : 'bg-slate-500'
              }`}
            />
            <span className="font-mono text-sm font-bold text-white capitalize">
              {isRunning
                ? 'Running...'
                : latestSummary
                ? latestSummary.status
                : 'Ready'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#0e1526] border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
            Progress ({percentComplete}%)
          </span>
          <div className="font-mono text-sm font-bold text-emerald-400">
            {passedCount} / {totalCount || (scenarios[0]?.stepCount || 0)} Steps
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#0e1526] border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
            {latestSummary?.totalTestCases ? 'Test Cases / Steps' : 'Passed / Failed'}
          </span>
          <div className="flex items-center space-x-2 font-mono text-sm font-bold">
            {latestSummary?.totalTestCases ? (
              <>
                <span className="text-emerald-400">
                  {latestSummary.passedTestCases || 0}/{latestSummary.totalTestCases} TC
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">{passedCount} Passed</span>
              </>
            ) : (
              <>
                <span className="text-emerald-400">{passedCount} Passed</span>
                <span className="text-slate-600">•</span>
                <span className={failedCount > 0 ? 'text-rose-400' : 'text-slate-500'}>
                  {failedCount} Failed
                </span>
              </>
            )}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#0e1526] border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
            Total Elapsed Time
          </span>
          <div className="font-mono text-sm font-bold text-blue-400 flex items-center space-x-1.5">
            <Clock className="w-4 h-4" />
            <span>
              {latestSummary ? `${(latestSummary.durationMs / 1000).toFixed(2)}s` : '0.00s'}
            </span>
          </div>
        </div>
      </div>

      {/* Subtab Switcher (Stream vs Report) */}
      <div className="px-4 pt-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('stream')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'stream'
                ? 'bg-[#0e1526] text-emerald-400 border-t-2 border-emerald-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Live Step Stream ({progressList.length})</span>
          </button>

          {latestSummary?.reportPath && (
            <button
              type="button"
              onClick={() => setActiveTab('report')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'report'
                  ? 'bg-[#0e1526] text-blue-400 border-t-2 border-blue-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>HTML Report</span>
            </button>
          )}
        </div>

        {latestSummary?.reportPath && (
          <div className="text-xs text-slate-400 flex items-center space-x-1 font-mono text-[10px]">
            <span>Report saved:</span>
            <code className="text-emerald-400 truncate max-w-xs">{latestSummary.reportPath}</code>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'stream' ? (
          /* Live Progress Feed */
          <div className="space-y-4 max-w-4xl mx-auto">
            {progressList.length === 0 ? (
              <div className="py-20 text-center text-slate-500 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                  <Terminal className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-300">Execution Stream Idle</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Select a scenario and click &quot;Run Test In-Memory&quot; to begin test execution in Google Chrome / Microsoft Edge.
                  </p>
                </div>
              </div>
            ) : (
              (() => {
                const testCaseGroups: {
                  id: string;
                  name: string;
                  steps: typeof progressList;
                }[] = [];

                for (const step of progressList) {
                  const tcId = step.testId || 'Default';
                  let group = testCaseGroups.find((g) => g.id === tcId);
                  if (!group) {
                    group = {
                      id: tcId,
                      name: step.testName || 'Main Scenario',
                      steps: [],
                    };
                    testCaseGroups.push(group);
                  }
                  group.steps.push(step);
                }

                return testCaseGroups.map((group) => {
                  const hasFailure = group.steps.some((s) => s.status === 'failed');
                  const hasRunning = group.steps.some((s) => s.status === 'running');
                  const allPassed =
                    !hasFailure && !hasRunning && group.steps.every((s) => s.status === 'passed');

                  return (
                    <div
                      key={group.id}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        hasFailure
                          ? 'border-rose-500/30 bg-[#120914]'
                          : hasRunning
                          ? 'border-amber-500/30 bg-[#0e1526]'
                          : allPassed
                          ? 'border-emerald-500/20 bg-[#0b1322]'
                          : 'border-slate-800 bg-[#0b1322]'
                      }`}
                    >
                      {/* Test Case Header Banner */}
                      <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {group.id}
                          </span>
                          <span className="text-xs font-semibold text-slate-200">
                            {group.name}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          {hasFailure ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              FAILED
                            </span>
                          ) : hasRunning ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                              <span>RUNNING</span>
                            </span>
                          ) : allPassed ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              PASSED
                            </span>
                          ) : null}

                          <button
                            type="button"
                            disabled={isRunning}
                            onClick={() => retestSingleTestCase(group.id)}
                            title={`Re-test only ${group.id} in isolation`}
                            className="flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 text-[11px] font-medium border border-slate-700 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Re-test</span>
                          </button>
                        </div>
                      </div>

                      {/* Steps under this Test Case */}
                      <div className="p-3 space-y-2">
                        {group.steps.map((step) => {
                          const isPassed = step.status === 'passed';
                          const isFailed = step.status === 'failed';
                          const isRunningStep = step.status === 'running';

                          return (
                            <div
                              key={step.stepIndex}
                              onClick={() => isFailed && setSelectedFailedStep(step)}
                              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                                isRunningStep
                                  ? 'bg-amber-500/10 border-amber-500/30'
                                  : isPassed
                                  ? 'bg-[#0d1728] border-emerald-500/15'
                                  : isFailed
                                  ? 'bg-rose-950/25 border-rose-500/30 cursor-pointer hover:border-rose-400'
                                  : 'bg-slate-900/50 border-slate-800 opacity-60'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px] flex items-center justify-center font-bold">
                                  {step.stepIndex + 1}
                                </span>

                                {isRunningStep ? (
                                  <span className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                                ) : isPassed ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                ) : isFailed ? (
                                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-slate-600" />
                                )}

                                <div className="space-y-0.5">
                                  <div className="flex items-center space-x-2">
                                    {step.stage && (
                                      <span
                                        className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-semibold ${
                                          step.stage === 'preconditions'
                                            ? 'bg-purple-500/15 text-purple-300'
                                            : step.stage === 'postconditions'
                                            ? 'bg-amber-500/15 text-amber-300'
                                            : 'bg-slate-800 text-slate-400'
                                        }`}
                                      >
                                        {step.stage}
                                      </span>
                                    )}
                                    <span className="font-mono text-xs font-semibold text-white">
                                      {step.action}
                                    </span>
                                    {step.target && (
                                      <span className="font-mono text-[11px] text-slate-400">
                                        {step.target}
                                      </span>
                                    )}
                                  </div>
                                  {step.error && (
                                    <div className="text-xs text-rose-400 line-clamp-1 font-mono">
                                      {step.error}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center space-x-3">
                                {step.durationMs !== undefined && (
                                  <span className="text-[11px] font-mono text-slate-400">
                                    {step.durationMs}ms
                                  </span>
                                )}
                                {isFailed && step.screenshotBase64 && (
                                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-semibold border border-rose-500/30 flex items-center space-x-1">
                                    <span>View Screenshot</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        ) : (
          /* Report View */
          <div className="w-full h-full flex flex-col space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0e1628] border border-slate-800">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-slate-200">
                  Standalone Offline HTML Report
                </span>
              </div>
              <a
                href={`file:///${latestSummary?.reportPath?.replace(/\\/g, '/')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
              >
                <span>Open in Default Browser</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {latestSummary?.reportPath && (
              <iframe
                title="Execution Report"
                src={`file:///${latestSummary.reportPath.replace(/\\/g, '/')}`}
                className="w-full flex-1 min-h-[550px] rounded-xl border border-slate-800 bg-[#090d16]"
              />
            )}
          </div>
        )}
      </div>

      {/* Failure Screenshot Modal */}
      {selectedFailedStep && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-3xl bg-[#0c1222] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold text-white">
                  Step #{selectedFailedStep.stepIndex + 1} Failure Inspector
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFailedStep(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-300 font-mono text-xs whitespace-pre-wrap">
                {selectedFailedStep.error}
              </div>

              {selectedFailedStep.screenshotBase64 ? (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    DOM Screenshot at Failure:
                  </span>
                  <div className="border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                    <img
                      src={`data:image/png;base64,${selectedFailedStep.screenshotBase64}`}
                      alt="Failed Step Screenshot"
                      className="w-full h-auto object-contain max-h-[480px]"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 text-center py-6">
                  No screenshot captured for this step.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedFailedStep(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

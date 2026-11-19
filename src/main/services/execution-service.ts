import path from 'path';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { BrowserWindow } from 'electron';
import type {
  IEmbeddedRunOptions,
  IScenario,
  IStep,
  IStepProgress,
  ITestRunSummary,
  ITestCase,
  ILocatorStore,
} from '../../shared/types.js';
import { ActionEngine } from '../engine/ActionEngine.js';
import { fileService } from './file-service.js';
import { reportService, type IReportStepDetail } from './report-service.js';

export class ExecutionService {
  private activeBrowsers = new Map<string, Browser>();
  private activeContexts = new Map<string, BrowserContext>();
  private abortedRuns = new Set<string>();

  public async executeScenario(
    options: IEmbeddedRunOptions,
    getMainWindow: () => BrowserWindow | null
  ): Promise<{ runId: string }> {
    const runId = `run_${Date.now()}`;
    const startTime = Date.now();

    // Start background asynchronous execution
    this.runInternal(runId, options, startTime, getMainWindow).catch((err) => {
      console.error(`[ExecutionService] Fatal error in run ${runId}:`, err);
    });

    return { runId };
  }

  public async abortRun(runId: string): Promise<boolean> {
    this.abortedRuns.add(runId);
    const ctx = this.activeContexts.get(runId);
    if (ctx) {
      try {
        await ctx.close();
      } catch {}
    }
    const browser = this.activeBrowsers.get(runId);
    if (browser) {
      try {
        await browser.close();
      } catch {}
      this.activeBrowsers.delete(runId);
    }
    return true;
  }

  private async runInternal(
    runId: string,
    options: IEmbeddedRunOptions,
    startTime: number,
    getMainWindow: () => BrowserWindow | null
  ): Promise<void> {
    const win = getMainWindow();

    const notifyProgress = (progress: IStepProgress) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('runner:stepProgress', progress);
      }
    };

    const notifyFinished = (summary: ITestRunSummary) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('runner:runFinished', summary);
      }
    };

    // 1. Load Scenario
    let scenario: IScenario;
    try {
      if (options.scenario) {
        scenario = options.scenario;
      } else if (options.scenarioPath) {
        scenario = await fileService.readScenario(options.scenarioPath);
      } else {
        throw new Error('No scenario or scenarioPath provided to runner.');
      }
    } catch (err: any) {
      notifyFinished({
        runId,
        scenarioName: options.scenarioPath || 'Unknown',
        status: 'failed',
        totalSteps: 0,
        passedSteps: 0,
        failedSteps: 1,
        skippedSteps: 0,
        durationMs: 0,
        error: `Failed to load scenario: ${err.message}`,
        timestamp: Date.now(),
      });
      return;
    }

    // 2. Load and merge all locators from data/locators/
    const combinedLocators: ILocatorStore = {};
    try {
      const locatorFiles = await fileService.listLocators();
      for (const file of locatorFiles) {
        try {
          const locContent = await fileService.readLocators(file);
          // If file is structured by page: { PageName: { elName: '...' } }
          for (const [key, val] of Object.entries(locContent)) {
            if (typeof val === 'object' && val !== null && !('value' in val)) {
              combinedLocators[key] = { ...(combinedLocators[key] || {}), ...(val as object) };
            } else {
              const defaultPage = file.replace(/\.json$/, '');
              if (!combinedLocators[defaultPage]) combinedLocators[defaultPage] = {};
              combinedLocators[defaultPage][key] = val;
            }
          }
        } catch (e) {
          console.warn(`[ExecutionService] Failed loading locator file ${file}:`, e);
        }
      }
    } catch (err) {
      console.warn('[ExecutionService] Could not list locators:', err);
    }

    // 3. Launch browser using system Chrome or Edge
    let browser: Browser | null = null;
    let chosenChannel = options.channel || 'chrome';

    const launchOptions = {
      headless: options.headless ?? false,
      slowMo: options.slowMo ?? (options.headless ? 0 : 50),
    };

    try {
      browser = await chromium.launch({ ...launchOptions, channel: chosenChannel });
    } catch (chromeError: any) {
      console.warn(`[ExecutionService] Failed launching channel "${chosenChannel}":`, chromeError.message);
      try {
        // Fallback to Microsoft Edge
        chosenChannel = 'msedge';
        browser = await chromium.launch({ ...launchOptions, channel: 'msedge' });
      } catch (edgeError: any) {
        console.warn(`[ExecutionService] Failed launching channel "msedge":`, edgeError.message);
        // Fallback to default Chromium
        try {
          chosenChannel = 'chromium';
          browser = await chromium.launch(launchOptions);
        } catch (chromiumError: any) {
          notifyFinished({
            runId,
            scenarioName: scenario.name || scenario.scenario || 'Scenario',
            status: 'failed',
            totalSteps: 0,
            passedSteps: 0,
            failedSteps: 1,
            skippedSteps: 0,
            durationMs: Date.now() - startTime,
            error: `Failed to launch browser (Tried Chrome, Edge, and Chromium): ${chromiumError.message}`,
            timestamp: Date.now(),
          });
          return;
        }
      }
    }

    this.activeBrowsers.set(runId, browser);

    // 4. Resolve Test Cases to Run
    const scenarioDisplayName =
      scenario.name || scenario.scenario || options.scenarioPath || 'Scenario';

    let testCasesToRun: ITestCase[] = [];
    if (Array.isArray(scenario.testCases) && scenario.testCases.length > 0) {
      testCasesToRun = scenario.testCases;
    } else if (Array.isArray(scenario.steps) && scenario.steps.length > 0) {
      testCasesToRun = [
        {
          testId: 'TC_01',
          testName: scenarioDisplayName,
          steps: scenario.steps,
        },
      ];
    } else {
      throw new Error('Scenario contains no executable steps or testCases.');
    }

    // Filter by selectedTestCaseIds if user selected specific test cases
    if (options.selectedTestCaseIds && options.selectedTestCaseIds.length > 0) {
      const selectedSet = new Set(options.selectedTestCaseIds);
      testCasesToRun = testCasesToRun.filter(
        (tc, idx) => selectedSet.has(tc.testId) || selectedSet.has(`TC_${idx + 1}`)
      );
      if (testCasesToRun.length === 0) {
        throw new Error('None of the selected test cases were found in this scenario.');
      }
    }

    // Calculate total steps across all test cases
    let totalSteps = 0;
    for (const tc of testCasesToRun) {
      totalSteps +=
        (tc.preconditions?.length || 0) +
        (tc.steps?.length || 0) +
        (tc.postconditions?.length || 0);
    }

    const totalTestCases = testCasesToRun.length;
    let passedTestCases = 0;
    let failedTestCases = 0;
    let passedCount = 0;
    let failedCount = 0;
    let globalStepIndex = 0;
    const reportSteps: IReportStepDetail[] = [];
    let overallStatus: 'passed' | 'failed' | 'aborted' = 'passed';
    let fatalError: string | undefined;

    // 5. Execute Each Test Case Independently with Fresh BrowserContext
    for (const testCase of testCasesToRun) {
      if (this.abortedRuns.has(runId)) {
        overallStatus = 'aborted';
        break;
      }

      const tcId = testCase.testId || `TC_${testCasesToRun.indexOf(testCase) + 1}`;
      const tcName = testCase.testName || testCase.name || 'Unnamed Test Case';

      let context: BrowserContext | null = null;
      let page: Page | null = null;
      let testCaseFailed = false;

      try {
        // Isolated BrowserContext per test case (Clean cookies, sessions, storage)
        context = await browser.newContext({
          viewport: options.viewport || { width: 1280, height: 720 },
        });
        this.activeContexts.set(runId, context);
        page = await context.newPage();

        const boundLocatorFileName = scenario.config?.locatorFile
          ? path.basename(scenario.config.locatorFile)
          : 'locators.json';

        const engine = new ActionEngine(
          page,
          context.request,
          combinedLocators,
          {},
          boundLocatorFileName,
          options.enableAutoHealing ?? false
        );

        // Helper to execute a list of steps in a stage
        const executeStepList = async (
          steps: IStep[] | undefined,
          stageName: 'preconditions' | 'steps' | 'postconditions',
          isTeardown: boolean = false
        ) => {
          if (!steps || steps.length === 0) return;

          for (let sIdx = 0; sIdx < steps.length; sIdx++) {
            if (this.abortedRuns.has(runId)) {
              overallStatus = 'aborted';
              break;
            }

            const step = steps[sIdx];
            const currentIdx = globalStepIndex++;
            const targetStr = step.element
              ? `${step.page || ''}.${step.element}`
              : step.url || step.flow || '';

            if (testCaseFailed && !isTeardown) {
              reportSteps.push({
                index: currentIdx,
                testId: tcId,
                testName: tcName,
                stage: stageName,
                action: step.action,
                target: targetStr,
                status: 'skipped',
                durationMs: 0,
              });
              continue;
            }

            const stepStart = Date.now();

            notifyProgress({
              runId,
              scenarioName: scenarioDisplayName,
              testId: tcId,
              testName: tcName,
              stage: stageName,
              stepIndex: currentIdx,
              totalSteps,
              action: step.action,
              target: targetStr,
              status: 'running',
              timestamp: stepStart,
            });

            try {
              if (isTeardown) {
                // Teardown steps have a strict timeout so a failure doesn't hang the runner
                await Promise.race([
                  engine.executeStep(step),
                  new Promise((_, reject) =>
                    setTimeout(
                      () => reject(new Error(`Teardown step [${step.action}] timed out`)),
                      5000
                    )
                  ),
                ]);
              } else {
                await engine.executeStep(step);
              }

              const duration = Date.now() - stepStart;
              passedCount++;

              notifyProgress({
                runId,
                scenarioName: scenarioDisplayName,
                testId: tcId,
                testName: tcName,
                stage: stageName,
                stepIndex: currentIdx,
                totalSteps,
                action: step.action,
                target: targetStr,
                status: 'passed',
                durationMs: duration,
                timestamp: Date.now(),
              });

              reportSteps.push({
                index: currentIdx,
                testId: tcId,
                testName: tcName,
                stage: stageName,
                action: step.action,
                target: targetStr,
                status: 'passed',
                durationMs: duration,
              });
            } catch (err: any) {
              const duration = Date.now() - stepStart;
              failedCount++;

              if (!isTeardown) {
                testCaseFailed = true;
                overallStatus = 'failed';
                fatalError = err.message || String(err);
              }

              let screenshotBase64: string | undefined;
              if (page && !page.isClosed()) {
                try {
                  const buffer = await page.screenshot({ timeout: 3000 });
                  screenshotBase64 = buffer.toString('base64');
                } catch {}
              }

              notifyProgress({
                runId,
                scenarioName: scenarioDisplayName,
                testId: tcId,
                testName: tcName,
                stage: stageName,
                stepIndex: currentIdx,
                totalSteps,
                action: step.action,
                target: targetStr,
                status: 'failed',
                durationMs: duration,
                error: err.message || String(err),
                screenshotBase64,
                timestamp: Date.now(),
              });

              reportSteps.push({
                index: currentIdx,
                testId: tcId,
                testName: tcName,
                stage: stageName,
                action: step.action,
                target: targetStr,
                status: 'failed',
                durationMs: duration,
                error: err.message || String(err),
                screenshotBase64,
              });
            }
          }
        };

        // 1. Run Preconditions (Setup)
        await executeStepList(testCase.preconditions, 'preconditions', false);

        // 2. Run Main Steps
        await executeStepList(testCase.steps, 'steps', false);

        // 3. Run Postconditions (Teardown - always executes)
        await executeStepList(testCase.postconditions, 'postconditions', true);
      } catch (tcErr: any) {
        testCaseFailed = true;
        overallStatus = 'failed';
        console.error(`[ExecutionService] Fatal error in test case [${tcId}]:`, tcErr);
      } finally {
        if (context) {
          try {
            await context.close();
          } catch {}
          this.activeContexts.delete(runId);
        }

        if (testCaseFailed) {
          failedTestCases++;
        } else {
          passedTestCases++;
        }
      }
    }

    // 6. Cleanup Browser
    try {
      await browser.close();
    } catch {}

    this.activeBrowsers.delete(runId);
    this.abortedRuns.delete(runId);

    const totalDuration = Date.now() - startTime;
    const skippedCount = totalSteps - (passedCount + failedCount);

    // 7. Generate HTML Report
    let reportPath: string | undefined;
    try {
      reportPath = reportService.generateHtmlReport({
        runId,
        scenarioName: scenarioDisplayName,
        startTime,
        endTime: Date.now(),
        durationMs: totalDuration,
        status: overallStatus,
        totalTestCases,
        passedTestCases,
        failedTestCases,
        totalSteps,
        passedSteps: passedCount,
        failedSteps: failedCount,
        skippedSteps: skippedCount,
        steps: reportSteps,
        browser: chosenChannel,
        headless: options.headless ?? false,
      });
    } catch (repErr) {
      console.error('[ExecutionService] Failed generating HTML report:', repErr);
    }

    // 8. Notify run finished
    notifyFinished({
      runId,
      scenarioName: scenarioDisplayName,
      status: overallStatus,
      totalTestCases,
      passedTestCases,
      failedTestCases,
      totalSteps,
      passedSteps: passedCount,
      failedSteps: failedCount,
      skippedSteps: skippedCount,
      durationMs: totalDuration,
      reportPath,
      error: fatalError,
      timestamp: Date.now(),
    });
  }
}

export const executionService = new ExecutionService();

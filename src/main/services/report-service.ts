import fs from 'node:fs';
import path from 'node:path';
import { workspaceService } from './workspace-service.js';

export interface IReportStepDetail {
  index: number;
  testId?: string;
  testName?: string;
  stage?: string;
  action: string;
  target?: string;
  status: 'passed' | 'failed' | 'skipped' | 'running';
  durationMs: number;
  error?: string;
  screenshotBase64?: string;
}

export interface IReportData {
  runId: string;
  scenarioName: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  status: 'passed' | 'failed' | 'aborted';
  totalTestCases?: number;
  passedTestCases?: number;
  failedTestCases?: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  steps: IReportStepDetail[];
  browser: string;
  headless: boolean;
}

export class ReportService {
  public generateHtmlReport(data: IReportData): string {
    const workspaceRoot = workspaceService.getActiveWorkspace();
    const reportsDir = workspaceRoot
      ? path.join(workspaceRoot, 'reports')
      : path.join(process.cwd(), 'reports');

    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const passRate = data.totalSteps > 0
      ? Math.round((data.passedSteps / data.totalSteps) * 100)
      : 0;

    const statusBadgeClass =
      data.status === 'passed'
        ? 'badge-passed'
        : data.status === 'failed'
        ? 'badge-failed'
        : 'badge-aborted';

    const renderStepCard = (step: IReportStepDetail) => {
      const stepStatusClass =
        step.status === 'passed'
          ? 'step-passed'
          : step.status === 'failed'
          ? 'step-failed'
          : 'step-skipped';

      const screenshotSection = step.screenshotBase64
        ? `
        <div class="screenshot-container">
          <div class="screenshot-title">📷 Failure Screenshot:</div>
          <img src="data:image/png;base64,${step.screenshotBase64}" class="screenshot-img" alt="Step Failure" />
        </div>`
        : '';

      const errorSection = step.error
        ? `<pre class="error-box">${this.escapeHtml(step.error)}</pre>`
        : '';

      const stageBadge = step.stage
        ? `<span class="stage-tag ${step.stage}">${this.escapeHtml(step.stage)}</span>`
        : '';

      return `
      <div class="step-card ${stepStatusClass}">
        <div class="step-header">
          <div class="step-info">
            <span class="step-index">#${step.index + 1}</span>
            ${stageBadge}
            <span class="step-action">${this.escapeHtml(step.action)}</span>
            ${step.target ? `<span class="step-target">${this.escapeHtml(step.target)}</span>` : ''}
          </div>
          <div class="step-meta">
            <span class="step-duration">${step.durationMs}ms</span>
            <span class="step-status ${step.status}">${step.status.toUpperCase()}</span>
          </div>
        </div>
        ${errorSection}
        ${screenshotSection}
      </div>`;
    };

    // Group steps by test case if testId is present
    const hasTestCases = data.steps.some((s) => s.testId);
    let executionContentHtml = '';

    if (hasTestCases) {
      const groups = new Map<string, { id: string; name: string; steps: IReportStepDetail[] }>();
      for (const step of data.steps) {
        const key = step.testId || 'Default';
        if (!groups.has(key)) {
          groups.set(key, {
            id: key,
            name: step.testName || 'Main Scenario',
            steps: [],
          });
        }
        groups.get(key)!.steps.push(step);
      }

      executionContentHtml = Array.from(groups.values())
        .map((group) => {
          const tcFailed = group.steps.some((s) => s.status === 'failed');
          const tcPassed = !tcFailed && group.steps.every((s) => s.status === 'passed');
          const tcBadgeClass = tcFailed ? 'badge-failed' : tcPassed ? 'badge-passed' : 'badge-aborted';
          const tcStatusText = tcFailed ? 'FAILED' : tcPassed ? 'PASSED' : 'INCOMPLETE';

          return `
          <div class="testcase-block ${tcFailed ? 'tc-failed' : 'tc-passed'}">
            <div class="testcase-header">
              <div class="testcase-title">
                <span class="testcase-id">[${this.escapeHtml(group.id)}]</span>
                <span class="testcase-name">${this.escapeHtml(group.name)}</span>
              </div>
              <span class="badge ${tcBadgeClass}">${tcStatusText}</span>
            </div>
            <div class="testcase-steps">
              ${group.steps.map(renderStepCard).join('\n')}
            </div>
          </div>`;
        })
        .join('\n');
    } else {
      executionContentHtml = data.steps.map(renderStepCard).join('\n');
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Execution Report - ${this.escapeHtml(data.scenarioName)}</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #0e1424;
      --border: #1e293b;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --green: #10b981;
      --green-bg: rgba(16, 185, 129, 0.1);
      --red: #f43f5e;
      --red-bg: rgba(244, 63, 94, 0.1);
      --amber: #f59e0b;
      --amber-bg: rgba(245, 158, 11, 0.1);
      --blue: #38bdf8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 2rem;
    }
    .container { max-width: 1080px; margin: 0 auto; }
    .header {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .title-group h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.25rem; }
    .title-group p { font-size: 0.875rem; color: var(--text-muted); }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1.25rem;
      text-align: center;
    }
    .metric-value { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.25rem; font-family: monospace; }
    .metric-label { font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; }
    .badge {
      display: inline-block;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-passed { background: var(--green-bg); color: var(--green); border: 1px solid var(--green); }
    .badge-failed { background: var(--red-bg); color: var(--red); border: 1px solid var(--red); }
    .badge-aborted { background: var(--amber-bg); color: var(--amber); border: 1px solid var(--amber); }
    .testcase-block {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 0.875rem;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .testcase-block.tc-failed { border-color: rgba(244, 63, 94, 0.4); }
    .testcase-block.tc-passed { border-color: rgba(16, 185, 129, 0.3); }
    .testcase-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border);
    }
    .testcase-title { font-size: 1.05rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
    .testcase-id { font-family: monospace; color: var(--blue); }
    .testcase-name { color: var(--text); }
    .steps-container {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 1.5rem;
    }
    .steps-container h2 { font-size: 1.125rem; margin-bottom: 1.25rem; font-weight: 600; }
    .step-card {
      background: #090e1a;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 0.875rem 1rem;
      margin-bottom: 0.6rem;
      transition: all 0.15s ease;
    }
    .step-passed { border-left: 4px solid var(--green); }
    .step-failed { border-left: 4px solid var(--red); background: #120914; }
    .step-skipped { border-left: 4px solid var(--text-muted); opacity: 0.7; }
    .step-header { display: flex; justify-content: space-between; align-items: center; }
    .step-info { display: flex; align-items: center; gap: 0.75rem; font-family: monospace; font-size: 0.875rem; }
    .step-index { color: var(--text-muted); font-size: 0.75rem; }
    .step-action { color: #f8fafc; font-weight: 600; }
    .step-target { color: var(--blue); }
    .stage-tag { font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 4px; text-transform: uppercase; font-weight: bold; background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
    .stage-tag.preconditions { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
    .stage-tag.postconditions { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .step-meta { display: flex; align-items: center; gap: 0.75rem; font-size: 0.75rem; font-family: monospace; }
    .step-duration { color: var(--text-muted); }
    .step-status { font-weight: 700; }
    .step-status.passed { color: var(--green); }
    .step-status.failed { color: var(--red); }
    .step-status.skipped { color: var(--text-muted); }
    .error-box {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.2);
      border-radius: 0.375rem;
      color: #fda4af;
      font-family: monospace;
      font-size: 0.75rem;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .screenshot-container { margin-top: 0.75rem; }
    .screenshot-title { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem; font-weight: 600; }
    .screenshot-img {
      max-width: 100%;
      max-height: 420px;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
    }
    .footer {
      text-align: center;
      margin-top: 2rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title-group">
        <h1>${this.escapeHtml(data.scenarioName)}</h1>
        <p>Run ID: ${this.escapeHtml(data.runId)} • Browser: ${this.escapeHtml(data.browser)} (${data.headless ? 'Headless' : 'Headed'}) • ${new Date(data.startTime).toLocaleString()}</p>
      </div>
      <div>
        <span class="badge ${statusBadgeClass}">${data.status}</span>
      </div>
    </div>

    <div class="metrics-grid">
      ${data.totalTestCases ? `
      <div class="metric-card">
        <div class="metric-value" style="color: ${data.failedTestCases ? 'var(--red)' : 'var(--green)'};">
          ${data.passedTestCases || 0} / ${data.totalTestCases}
        </div>
        <div class="metric-label">Test Cases Passed</div>
      </div>` : ''}
      <div class="metric-card">
        <div class="metric-value" style="color: var(--green);">${passRate}%</div>
        <div class="metric-label">Pass Rate</div>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color: var(--green);">${data.passedSteps} / ${data.totalSteps}</div>
        <div class="metric-label">Passed Steps</div>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color: ${data.failedSteps > 0 ? 'var(--red)' : 'var(--text-muted)'};">${data.failedSteps}</div>
        <div class="metric-label">Failed Steps</div>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color: var(--blue);">${(data.durationMs / 1000).toFixed(2)}s</div>
        <div class="metric-label">Total Duration</div>
      </div>
    </div>

    <div class="steps-container">
      <h2>${hasTestCases ? 'Test Case Breakdown & Steps' : 'Step-by-Step Execution Breakdown'}</h2>
      ${executionContentHtml}
    </div>

    <div class="footer">
      Generated automatically by Playwright Embedded Studio • 100% Offline Air-Gapped Report
    </div>
  </div>
</body>
</html>`;

    const runFilePath = path.join(reportsDir, `run_${data.runId}.html`);
    const indexFilePath = path.join(reportsDir, 'index.html');

    fs.writeFileSync(runFilePath, htmlContent, 'utf-8');
    fs.writeFileSync(indexFilePath, htmlContent, 'utf-8');

    return indexFilePath;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export const reportService = new ReportService();

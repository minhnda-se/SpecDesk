import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('🧪 SPECDESK - ENGINE INTEGRATION TEST');
console.log('====================================================\n');

async function runTest() {
  const startTime = Date.now();
  const testWorkspace = path.resolve('test-workspace');
  const reportsDir = path.join(testWorkspace, 'reports');

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // 1. Detect and Launch Browser
  console.log('1️⃣  Detecting system browser (Chrome / Edge)...');
  let browser;
  let browserChannel = 'chrome';

  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    try {
      console.log('   Chrome not found, falling back to Microsoft Edge...');
      browser = await chromium.launch({ channel: 'msedge', headless: true });
      browserChannel = 'msedge';
    } catch {
      console.log('   Edge not found, falling back to embedded chromium...');
      browser = await chromium.launch({ headless: true });
      browserChannel = 'chromium';
    }
  }

  console.log(`   ✓ Successfully launched browser via channel [${browserChannel}] (Version: ${browser.version()})`);

  // 2. Setup Context & Page
  const context = await browser.newContext();
  const page = await context.newPage();

  // 3. Define Test Steps
  const steps = [
    {
      action: 'goto',
      url: 'https://example.com',
      description: 'Navigate to Example Domain'
    },
    {
      action: 'verify_visible',
      selector: 'h1',
      description: 'Verify main heading is visible'
    },
    {
      action: 'verify_text',
      selector: 'h1',
      expected: 'Example Domain',
      description: 'Verify heading text equals "Example Domain"'
    },
    {
      action: 'verify_visible',
      selector: 'p >> nth=0',
      description: 'Verify first paragraph is visible'
    }
  ];

  console.log(`\n2️⃣  Executing ${steps.length} test steps...`);

  const stepResults = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepStart = Date.now();
    process.stdout.write(`   Step ${i + 1}/${steps.length}: [${step.action}] ${step.description}... `);

    try {
      if (step.action === 'goto') {
        await page.goto(step.url, { timeout: 15000, waitUntil: 'domcontentloaded' });
      } else if (step.action === 'verify_visible') {
        const locator = page.locator(step.selector);
        await locator.waitFor({ state: 'visible', timeout: 5000 });
      } else if (step.action === 'verify_text') {
        const locator = page.locator(step.selector);
        const actualText = (await locator.innerText()).trim();
        if (!actualText.includes(step.expected)) {
          throw new Error(`Expected text to include "${step.expected}", but got "${actualText}"`);
        }
      }

      const duration = Date.now() - stepStart;
      console.log(`✅ PASSED (${duration}ms)`);
      stepResults.push({
        stepIndex: i + 1,
        action: step.action,
        description: step.description,
        status: 'passed',
        durationMs: duration
      });
    } catch (err) {
      const duration = Date.now() - stepStart;
      console.log(`❌ FAILED (${duration}ms) - ${err.message}`);
      stepResults.push({
        stepIndex: i + 1,
        action: step.action,
        description: step.description,
        status: 'failed',
        durationMs: duration,
        error: err.message
      });
    }
  }

  // 4. Teardown
  await context.close();
  await browser.close();

  const totalDuration = Date.now() - startTime;
  const passedCount = stepResults.filter((s) => s.status === 'passed').length;
  const failedCount = stepResults.filter((s) => s.status === 'failed').length;

  console.log('\n3️⃣  Test Execution Summary:');
  console.log(`   - Total Steps:  ${stepResults.length}`);
  console.log(`   - Passed:       ${passedCount}`);
  console.log(`   - Failed:       ${failedCount}`);
  console.log(`   - Total Time:   ${totalDuration}ms`);

  // 5. Generate Offline HTML Report
  const reportPath = path.join(reportsDir, 'test_report.html');
  const reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CLI Test Verification Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
    .card { background: #1e293b; border-radius: 12px; padding: 1.5rem; max-width: 800px; margin: 0 auto; border: 1px solid #334155; }
    .badge { padding: 4px 10px; border-radius: 9999px; font-weight: bold; font-size: 13px; }
    .badge-passed { background: #064e3b; color: #34d399; }
    .badge-failed { background: #881337; color: #f43f5e; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #334155; font-size: 14px; }
    th { color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <h2>🧪 CLI Integration Test Report</h2>
    <p>Engine: <strong>playwright-core</strong> | Channel: <strong>${browserChannel}</strong> | Status: <span class="badge ${failedCount === 0 ? 'badge-passed' : 'badge-failed'}">${failedCount === 0 ? 'ALL PASSED' : 'FAILED'}</span></p>
    <p>Duration: <strong>${totalDuration}ms</strong> | Generated at: ${new Date().toLocaleString()}</p>
    <table>
      <thead>
        <tr><th>#</th><th>Action</th><th>Description</th><th>Status</th><th>Duration</th></tr>
      </thead>
      <tbody>
        ${stepResults.map(s => `<tr><td>${s.stepIndex}</td><td><code>${s.action}</code></td><td>${s.description}</td><td><span class="badge ${s.status === 'passed' ? 'badge-passed' : 'badge-failed'}">${s.status.toUpperCase()}</span></td><td>${s.durationMs}ms</td></tr>`).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;

  fs.writeFileSync(reportPath, reportHtml, 'utf-8');
  console.log(`\n4️⃣  Report Generated:`);
  console.log(`   ✓ Offline HTML Report written to: ${reportPath}`);

  if (failedCount > 0) {
    console.error('\n❌ Test run finished with failures.');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL TESTS PASSED! System is ready for packaging.\n');
  }
}

runTest().catch((err) => {
  console.error('\n💥 Unexpected fatal error during test execution:', err);
  process.exit(1);
});

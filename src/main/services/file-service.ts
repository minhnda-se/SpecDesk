import fs from 'node:fs';
import path from 'node:path';
import type { IScenario, IScenarioFileMeta, ILocatorStore } from '../../shared/types.js';
import { workspaceService } from './workspace-service.js';

export class FileService {
  // Set of recently self-written files with expiration timestamps to suppress watcher self-loops
  private selfWrittenPaths = new Map<string, number>();

  private getProjectRoot(): string {
    const root = workspaceService.getActiveWorkspace();
    if (!root) {
      throw new Error('No active workspace folder connected.');
    }
    return root;
  }

  public isSelfWritten(filePath: string): boolean {
    const normalized = path.normalize(filePath);
    const expireTime = this.selfWrittenPaths.get(normalized);
    if (!expireTime) return false;

    if (Date.now() > expireTime) {
      this.selfWrittenPaths.delete(normalized);
      return false;
    }
    return true;
  }

  private markSelfWritten(filePath: string): void {
    const normalized = path.normalize(filePath);
    // Ignore watcher events for this file for 1500ms
    this.selfWrittenPaths.set(normalized, Date.now() + 1500);
  }

  public async atomicWriteJson(targetPath: string, data: any): Promise<void> {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const tempPath = `${targetPath}.tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const jsonString = JSON.stringify(data, null, 2);

    this.markSelfWritten(targetPath);
    this.markSelfWritten(tempPath);

    fs.writeFileSync(tempPath, jsonString, 'utf-8');
    fs.renameSync(tempPath, targetPath);
  }

  // --- Dynamic Directory Discovery Helpers ---

  public getScenariosDir(): string {
    const root = this.getProjectRoot();
    const candidateDirs = [
      path.join(root, 'data', 'scenarios'),
      path.join(root, 'scenarios'),
      path.join(root, 'tc'),
      path.join(root, 'testcases'),
      path.join(root, 'tests'),
    ];

    for (const dir of candidateDirs) {
      if (fs.existsSync(dir)) {
        const jsonFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
        if (jsonFiles.length > 0) return dir;
      }
    }

    // Check if root itself has JSON files that look like scenarios
    if (fs.existsSync(root)) {
      const rootFiles = fs.readdirSync(root).filter((f) => f.endsWith('.json') && !f.startsWith('.'));
      for (const f of rootFiles) {
        if (['package.json', 'package-lock.json', 'tsconfig.json', 'electron-builder.json'].includes(f.toLowerCase())) {
          continue;
        }
        try {
          const content = fs.readFileSync(path.join(root, f), 'utf-8');
          const parsed = JSON.parse(content);
          if (parsed.steps || parsed.testCases || parsed.scenario) {
            return root;
          }
        } catch {}
      }
    }

    // Fallback: If any candidate directory exists, use it
    for (const dir of candidateDirs) {
      if (fs.existsSync(dir)) return dir;
    }

    // Default to root
    return root;
  }

  public resolveScenarioPath(fileName: string): string {
    const root = this.getProjectRoot();
    const normalized = fileName.endsWith('.json') ? fileName : `${fileName}.json`;

    // 1. Absolute path
    if (path.isAbsolute(fileName) && fs.existsSync(fileName)) {
      return fileName;
    }
    // 2. Direct relative to root
    const rootPath = path.join(root, normalized);
    if (fs.existsSync(rootPath)) {
      return rootPath;
    }
    // 3. Inside detected scenariosDir
    const scenariosDir = this.getScenariosDir();
    const inScenarios = path.join(scenariosDir, normalized);
    if (fs.existsSync(inScenarios)) {
      return inScenarios;
    }
    // 4. Try candidate subfolders
    const candidateDirs = ['data/scenarios', 'scenarios', 'tc', 'testcases', 'tests'];
    for (const sub of candidateDirs) {
      const candidatePath = path.join(root, sub, normalized);
      if (fs.existsSync(candidatePath)) {
        return candidatePath;
      }
    }
    // For new files: if scenariosDir exists use it, otherwise use root
    return inScenarios;
  }

  public getLocatorsDir(): string {
    const root = this.getProjectRoot();
    const candidateDirs = [
      path.join(root, 'data', 'locators'),
      path.join(root, 'locators'),
      path.join(root, 'locator'),
      path.join(root, 'pages'),
      path.join(root, 'page-objects'),
    ];

    for (const dir of candidateDirs) {
      if (fs.existsSync(dir)) {
        const jsonFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
        if (jsonFiles.length > 0) return dir;
      }
    }

    for (const dir of candidateDirs) {
      if (fs.existsSync(dir)) return dir;
    }

    return root;
  }

  public resolveLocatorPath(fileName: string): string {
    const root = this.getProjectRoot();
    const normalized = fileName.endsWith('.json') ? fileName : `${fileName}.json`;

    if (path.isAbsolute(fileName) && fs.existsSync(fileName)) {
      return fileName;
    }
    const rootPath = path.join(root, normalized);
    if (fs.existsSync(rootPath)) {
      return rootPath;
    }
    const locatorsDir = this.getLocatorsDir();
    const inLocators = path.join(locatorsDir, normalized);
    if (fs.existsSync(inLocators)) {
      return inLocators;
    }
    const candidateDirs = ['data/locators', 'locators', 'locator', 'pages'];
    for (const sub of candidateDirs) {
      const candidatePath = path.join(root, sub, normalized);
      if (fs.existsSync(candidatePath)) {
        return candidatePath;
      }
    }
    return inLocators;
  }

  public getFlowsDir(): string {
    const root = this.getProjectRoot();
    const candidateDirs = [
      path.join(root, 'data', 'flows'),
      path.join(root, 'flows'),
      path.join(root, 'common'),
    ];
    for (const dir of candidateDirs) {
      if (fs.existsSync(dir)) return dir;
    }
    return root;
  }

  public resolveFlowPath(fileName: string): string {
    const root = this.getProjectRoot();
    const normalized = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
    if (path.isAbsolute(fileName) && fs.existsSync(fileName)) {
      return fileName;
    }
    const rootPath = path.join(root, normalized);
    if (fs.existsSync(rootPath)) {
      return rootPath;
    }
    const inFlows = path.join(this.getFlowsDir(), normalized);
    if (fs.existsSync(inFlows)) {
      return inFlows;
    }
    return inFlows;
  }

  // --- Scenario Methods ---

  public async listScenarios(): Promise<IScenarioFileMeta[]> {
    const root = this.getProjectRoot();
    if (!fs.existsSync(root)) return [];

    const scenariosDir = this.getScenariosDir();
    const filesToInspect = new Map<string, string>(); // fullPath -> displayPath

    // 1. Scan resolved scenariosDir
    if (fs.existsSync(scenariosDir)) {
      const entries = fs.readdirSync(scenariosDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          const lower = entry.name.toLowerCase();
          if (['package.json', 'package-lock.json', 'tsconfig.json', 'electron-builder.json'].includes(lower)) {
            continue;
          }
          const full = path.join(scenariosDir, entry.name);
          const display = path.relative(root, full).replace(/\\/g, '/');
          filesToInspect.set(full, display);
        }
      }
    }

    // 2. Also check common candidate subfolders if they exist
    const candidateSubfolders = ['scenarios', 'tc', 'testcases', 'tests', 'data/scenarios'];
    for (const sub of candidateSubfolders) {
      const dir = path.join(root, sub);
      if (fs.existsSync(dir)) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile() && entry.name.endsWith('.json')) {
            const full = path.join(dir, entry.name);
            const display = path.relative(root, full).replace(/\\/g, '/');
            filesToInspect.set(full, display);
          }
        }
      }
    }

    // 3. If root itself has json files and was not the scenariosDir, check them
    if (scenariosDir !== root && fs.existsSync(root)) {
      const entries = fs.readdirSync(root, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          const lower = entry.name.toLowerCase();
          if (['package.json', 'package-lock.json', 'tsconfig.json', 'electron-builder.json'].includes(lower)) {
            continue;
          }
          const full = path.join(root, entry.name);
          filesToInspect.set(full, entry.name);
        }
      }
    }

    const metas: IScenarioFileMeta[] = [];

    for (const [fullPath, displayPath] of filesToInspect.entries()) {
      try {
        const stat = fs.statSync(fullPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const parsed = JSON.parse(content) as IScenario;

        // Verify that this JSON is genuinely a scenario file
        const isScenario =
          Array.isArray(parsed.testCases) ||
          Array.isArray(parsed.steps) ||
          typeof parsed.scenario === 'string' ||
          Boolean(parsed.name && (parsed.tags || (parsed as any).preconditions || (parsed as any).postconditions));

        if (!isScenario) {
          // Not a test scenario, skip it (could be locator, config, package, etc.)
          continue;
        }

        let stepCount = 0;
        let testCaseCount = 0;
        let testCaseSummary: { testId: string; testName: string; stepCount: number }[] = [];

        if (Array.isArray(parsed.testCases) && parsed.testCases.length > 0) {
          testCaseCount = parsed.testCases.length;
          testCaseSummary = parsed.testCases.map((tc, idx) => {
            const tcSteps =
              (tc.preconditions?.length || 0) +
              (tc.steps?.length || 0) +
              (tc.postconditions?.length || 0);
            return {
              testId: tc.testId || `TC_${idx + 1}`,
              testName: tc.testName || tc.name || `Test Case ${idx + 1}`,
              stepCount: tcSteps,
            };
          });
          stepCount = testCaseSummary.reduce((sum, item) => sum + item.stepCount, 0);
        } else if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
          testCaseCount = 1;
          stepCount = parsed.steps.length;
          testCaseSummary = [
            {
              testId: 'TC_01',
              testName: parsed.name || parsed.scenario || 'Main Scenario',
              stepCount: parsed.steps.length,
            },
          ];
        }

        const tags = [
          ...(parsed.tags || []),
          ...(parsed.config?.tags || []),
        ];

        metas.push({
          name: parsed.name || parsed.scenario || path.basename(displayPath, '.json'),
          path: displayPath,
          stepCount,
          testCaseCount,
          testCases: testCaseSummary,
          tags: Array.from(new Set(tags)),
          lastModified: stat.mtimeMs,
        });
      } catch (err) {
        console.warn(`[FileService] Failed to parse scenario ${displayPath}:`, err);
      }
    }

    return metas.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
  }

  public async readScenario(fileName: string): Promise<IScenario> {
    const fullPath = this.resolveScenarioPath(fileName);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Scenario file not found: ${fileName}`);
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(content) as IScenario;
  }

  public async saveScenario(
    fileName: string,
    data: IScenario
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const fullPath = this.resolveScenarioPath(fileName);
      await this.atomicWriteJson(fullPath, data);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  public async deleteScenario(fileName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const fullPath = this.resolveScenarioPath(fileName);
      if (fs.existsSync(fullPath)) {
        this.markSelfWritten(fullPath);
        fs.unlinkSync(fullPath);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  // --- Locator Methods ---

  public async listLocators(): Promise<string[]> {
    const root = this.getProjectRoot();
    if (!fs.existsSync(root)) return [];

    const locatorsDir = this.getLocatorsDir();
    const result = new Set<string>();

    if (fs.existsSync(locatorsDir) && locatorsDir !== root) {
      const files = fs.readdirSync(locatorsDir).filter((f) => f.endsWith('.json'));
      for (const f of files) {
        result.add(path.relative(root, path.join(locatorsDir, f)).replace(/\\/g, '/'));
      }
    }

    const candidateDirs = ['locators', 'locator', 'pages', 'data/locators'];
    for (const dirName of candidateDirs) {
      const fullDir = path.join(root, dirName);
      if (fs.existsSync(fullDir)) {
        const files = fs.readdirSync(fullDir).filter((f) => f.endsWith('.json'));
        for (const f of files) {
          result.add(`${dirName}/${f}`);
        }
      }
    }

    // If locatorsDir is root or candidate dirs are empty, check root files that are locator maps
    if (result.size === 0 && fs.existsSync(root)) {
      const files = fs.readdirSync(root).filter((f) => f.endsWith('.json') && !f.startsWith('.'));
      for (const f of files) {
        if (['package.json', 'package-lock.json', 'tsconfig.json', 'electron-builder.json'].includes(f.toLowerCase())) {
          continue;
        }
        try {
          const content = fs.readFileSync(path.join(root, f), 'utf-8');
          const parsed = JSON.parse(content);
          if (!parsed.steps && !parsed.testCases) {
            result.add(f);
          }
        } catch {}
      }
    }

    return Array.from(result);
  }

  public async readLocators(fileName: string): Promise<ILocatorStore> {
    const fullPath = this.resolveLocatorPath(fileName);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Locator file not found: ${fileName}`);
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(content) as ILocatorStore;
  }

  public async saveLocators(
    fileName: string,
    data: ILocatorStore
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const fullPath = this.resolveLocatorPath(fileName);
      await this.atomicWriteJson(fullPath, data);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  // --- Flow Methods ---

  public async listFlows(): Promise<string[]> {
    const root = this.getProjectRoot();
    const flowsDir = this.getFlowsDir();
    if (!fs.existsSync(flowsDir)) return [];

    return fs.readdirSync(flowsDir).filter((f) => f.endsWith('.json'));
  }

  public async readFlow(fileName: string): Promise<any> {
    const fullPath = this.resolveFlowPath(fileName);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Flow file not found: ${fileName}`);
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(content);
  }

  public async saveFlow(
    fileName: string,
    data: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const fullPath = this.resolveFlowPath(fileName);
      await this.atomicWriteJson(fullPath, data);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }
}

export const fileService = new FileService();

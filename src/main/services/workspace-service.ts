import { app, dialog, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export class WorkspaceService {
  private activeWorkspace: string | null = null;
  private recentsFilePath: string;

  constructor() {
    try {
      this.recentsFilePath = path.join(app.getPath('userData'), 'recents.json');
    } catch {
      this.recentsFilePath = path.join(process.cwd(), '.recents.json');
    }
  }

  public getActiveWorkspace(): string | null {
    return this.activeWorkspace;
  }

  public setActiveWorkspace(workspacePath: string | null): void {
    this.activeWorkspace = workspacePath;
  }

  public getRecentProjects(): string[] {
    try {
      if (fs.existsSync(this.recentsFilePath)) {
        const content = fs.readFileSync(this.recentsFilePath, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          return parsed.filter((p) => typeof p === 'string' && fs.existsSync(p));
        }
      }
    } catch (err) {
      console.error('[WorkspaceService] Failed to read recents file:', err);
    }
    return [];
  }

  public saveRecentProject(folderPath: string): void {
    try {
      const recents = this.getRecentProjects().filter((p) => p !== folderPath);
      recents.unshift(folderPath);
      if (recents.length > 10) recents.pop();

      const dir = path.dirname(this.recentsFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.recentsFilePath, JSON.stringify(recents, null, 2), 'utf-8');
    } catch (err) {
      console.error('[WorkspaceService] Failed to save recents file:', err);
    }
  }

  public closeWorkspace(): void {
    this.activeWorkspace = null;
  }

  public removeRecentProject(folderPath: string): string[] {
    try {
      const recents = this.getRecentProjects().filter((p) => path.normalize(p) !== path.normalize(folderPath));
      fs.writeFileSync(this.recentsFilePath, JSON.stringify(recents, null, 2), 'utf-8');
      return recents;
    } catch (err) {
      console.error('[WorkspaceService] Failed to remove recent project:', err);
      return this.getRecentProjects();
    }
  }

  public async deleteWorkspaceFolder(folderPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.activeWorkspace && path.normalize(this.activeWorkspace) === path.normalize(folderPath)) {
        this.activeWorkspace = null;
      }
      this.removeRecentProject(folderPath);

      if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
      }
      return { success: true };
    } catch (err: any) {
      console.error('[WorkspaceService] Failed to delete workspace folder:', err);
      return { success: false, error: err.message || String(err) };
    }
  }

  public importBundledTemplates(targetDir?: string): { success: boolean; importedCount: number; error?: string } {
    const root = targetDir || this.activeWorkspace;
    if (!root || !fs.existsSync(root)) {
      return { success: false, importedCount: 0, error: 'No active workspace connected.' };
    }

    const templateDirs = [
      path.join(__dirname, '../../resources/templates/data'),
      path.join(process.cwd(), 'resources/templates/data'),
      path.join(app.getAppPath ? app.getAppPath() : process.cwd(), 'resources/templates/data'),
      path.join(process.resourcesPath || '', 'templates/data'),
    ];

    const foundTemplatesDataDir = templateDirs.find((d) => fs.existsSync(d));
    if (!foundTemplatesDataDir) {
      return { success: false, importedCount: 0, error: 'Bundled templates not found.' };
    }

    let importedCount = 0;
    const tmplScenarios = path.join(foundTemplatesDataDir, 'scenarios');
    const tmplLocators = path.join(foundTemplatesDataDir, 'locators');

    // Prefer existing scenarios folder or create scenarios/
    const destScenarios = fs.existsSync(path.join(root, 'scenarios'))
      ? path.join(root, 'scenarios')
      : fs.existsSync(path.join(root, 'tc'))
      ? path.join(root, 'tc')
      : fs.existsSync(path.join(root, 'data', 'scenarios'))
      ? path.join(root, 'data', 'scenarios')
      : path.join(root, 'scenarios');

    const destLocators = fs.existsSync(path.join(root, 'locators'))
      ? path.join(root, 'locators')
      : fs.existsSync(path.join(root, 'data', 'locators'))
      ? path.join(root, 'data', 'locators')
      : path.join(root, 'locators');

    if (!fs.existsSync(destScenarios)) fs.mkdirSync(destScenarios, { recursive: true });
    if (!fs.existsSync(destLocators)) fs.mkdirSync(destLocators, { recursive: true });

    if (fs.existsSync(tmplScenarios)) {
      for (const file of fs.readdirSync(tmplScenarios)) {
        const dest = path.join(destScenarios, file);
        if (!fs.existsSync(dest)) {
          try {
            fs.copyFileSync(path.join(tmplScenarios, file), dest);
            importedCount++;
          } catch {}
        }
      }
    }

    if (fs.existsSync(tmplLocators)) {
      for (const file of fs.readdirSync(tmplLocators)) {
        const dest = path.join(destLocators, file);
        if (!fs.existsSync(dest)) {
          try {
            fs.copyFileSync(path.join(tmplLocators, file), dest);
            importedCount++;
          } catch {}
        }
      }
    }

    return { success: true, importedCount };
  }

  public async selectFolder(
    win?: BrowserWindow | null
  ): Promise<{ canceled: boolean; path?: string }> {
    const options: Electron.OpenDialogOptions = {
      title: 'Open SpecDesk Workspace Folder',
      properties: ['openDirectory', 'createDirectory'],
    };

    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const selectedPath = result.filePaths[0];
    this.setActiveWorkspace(selectedPath);
    this.saveRecentProject(selectedPath);

    return { canceled: false, path: selectedPath };
  }

  public async openFolder(
    folderPath: string
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      if (!fs.existsSync(folderPath)) {
        return { success: false, error: `Directory does not exist: ${folderPath}` };
      }

      this.setActiveWorkspace(folderPath);
      this.saveRecentProject(folderPath);

      return { success: true, path: folderPath };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }
}

export const workspaceService = new WorkspaceService();

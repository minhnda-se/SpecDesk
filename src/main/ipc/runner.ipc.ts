import { ipcMain, BrowserWindow } from 'electron';
import type { IEmbeddedRunOptions } from '../../shared/types.js';
import { executionService } from '../services/execution-service.js';

export function registerRunnerIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('runner:executeScenario', async (_event, options: IEmbeddedRunOptions) => {
    return executionService.executeScenario(options, getMainWindow);
  });

  ipcMain.handle('runner:stop', async (_event, runId: string) => {
    return executionService.abortRun(runId);
  });
}

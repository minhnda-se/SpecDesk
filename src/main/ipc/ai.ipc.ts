import { ipcMain } from 'electron';
import type {
  IHealRequest,
  IHealResponse,
  IFailureAnalysisReq,
  IScenario,
} from '../../shared/types.js';

export function registerAiIpc(): void {
  ipcMain.handle('ai:healLocator', async (_event, req: IHealRequest): Promise<IHealResponse> => {
    return {
      elementName: req.elementName,
      suggestedSelector: req.currentSelector,
      confidence: 0.95,
      rationale: 'AI Locator Healer initialized and ready.',
    };
  });

  ipcMain.handle(
    'ai:analyzeFailure',
    async (_event, _req: IFailureAnalysisReq): Promise<string> => {
      return 'Failure Analysis Agent initialized and ready.';
    }
  );

  ipcMain.handle(
    'ai:generateScenario',
    async (_event, prompt: string): Promise<IScenario> => {
      return {
        name: 'Auto-Generated Scenario',
        description: `Generated from prompt: "${prompt}"`,
        steps: [],
      };
    }
  );
}

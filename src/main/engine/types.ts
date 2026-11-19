import type { IStep } from '../../shared/types.js';

export interface IActionHandler {
  canHandle(actionName: string): boolean;
  handle(step: IStep, locatorStr: string, resolvedData: any, stepDesc: string): Promise<void>;
}

export type IDataRow = Record<string, any>;

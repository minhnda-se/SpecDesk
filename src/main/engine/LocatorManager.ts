import type { ILocatorStore } from '../../shared/types.js';

export class LocatorManager {
  private currentLocators: ILocatorStore;

  constructor(currentLocators: ILocatorStore) {
    this.currentLocators = currentLocators || {};
  }

  public getLocator(pageName?: string, elementName?: string): string {
    if (!pageName || !elementName) return '';

    const pageLocators = this.currentLocators[pageName];
    if (!pageLocators) {
      // Safe fallback: check if elementName exists directly at root (flat locator structure)
      const flatVal = (this.currentLocators as any)[elementName];
      if (flatVal) {
        const locator = typeof flatVal === 'string' ? flatVal : flatVal.value || '';
        return locator.includes('nth=') ? locator : `${locator} >> nth=0`;
      }
      throw new Error(`[LocatorManager] Page "${pageName}" not found in locators repository.`);
    }

    const val = pageLocators[elementName];
    if (!val) {
      // Safe fallback: check if elementName exists directly at root
      const flatVal = (this.currentLocators as any)[elementName];
      if (flatVal) {
        const locator = typeof flatVal === 'string' ? flatVal : flatVal.value || '';
        return locator.includes('nth=') ? locator : `${locator} >> nth=0`;
      }
      throw new Error(`[LocatorManager] Element "${elementName}" not found in Page "${pageName}".`);
    }

    const locator = typeof val === 'string' ? val : val.value || '';
    return locator.includes('nth=') ? locator : `${locator} >> nth=0`;
  }

  public updateRuntimeLocator(pageName: string, elementName: string, newLocator: string): void {
    if (!this.currentLocators[pageName]) {
      this.currentLocators[pageName] = {};
    }
    this.currentLocators[pageName][elementName] = newLocator;
  }
}

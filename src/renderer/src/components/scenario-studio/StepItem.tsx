import React, { useMemo } from 'react';
import {
  GripVertical,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Globe,
  ShieldCheck,
  Sparkles,
  Shuffle,
} from 'lucide-react';
import type { IStep } from '../../../../shared/types';
import { ACTION_CATEGORIES } from '../../../../shared/constants';
import { DynamicTokenPicker } from './DynamicTokenPicker';
import { SearchableCombobox, ComboboxOption } from './SearchableCombobox';

export interface LocatorItemMeta {
  name: string;
  selector?: string;
  type?: string;
}

export type LocatorMapData = Record<string, Array<string | LocatorItemMeta>>;

interface StepItemProps {
  index: number;
  totalSteps: number;
  step: IStep;
  availablePages: string[];
  locatorMap: LocatorMapData;
  hasLocatorRepo?: boolean;
  onUpdateStep: (updated: IStep) => void;
  onCloneStep: () => void;
  onDeleteStep: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}

export function StepItem({
  index,
  totalSteps,
  step,
  availablePages,
  locatorMap,
  hasLocatorRepo = true,
  onUpdateStep,
  onCloneStep,
  onDeleteStep,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
}: StepItemProps) {
  // Determine category
  const isAssertion = step.action.startsWith('verify_');
  const isApi = step.action.startsWith('api_');
  const isFlow = step.action === 'call_flow';

  const categoryColor = isAssertion
    ? 'border-emerald-500/30 bg-emerald-950/10'
    : isApi
    ? 'border-purple-500/30 bg-purple-950/10'
    : isFlow
    ? 'border-amber-500/30 bg-amber-950/10'
    : 'border-blue-500/30 bg-blue-950/10';

  const categoryIcon = isAssertion ? (
    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
  ) : isApi ? (
    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
  ) : isFlow ? (
    <Shuffle className="w-3.5 h-3.5 text-amber-400" />
  ) : (
    <Globe className="w-3.5 h-3.5 text-blue-400" />
  );

  const pageOptions: ComboboxOption[] = useMemo(() => {
    return availablePages.map((page) => {
      const items = locatorMap[page] || [];
      return {
        value: page,
        label: page,
        detail: items.length > 0 ? `${items.length} elements` : undefined,
      };
    });
  }, [availablePages, locatorMap]);

  const elementOptions: ComboboxOption[] = useMemo(() => {
    if (!step.page) return [];
    const items = locatorMap[step.page] || [];
    return items.map((item) => {
      if (typeof item === 'string') {
        return { value: item, label: item };
      }
      return {
        value: item.name,
        label: item.name,
        detail: item.selector,
        badge: item.type,
      };
    });
  }, [step.page, locatorMap]);

  const needsElement =
    !isApi &&
    !isFlow &&
    ![
      'goto',
      'wait',
      'switch_new_tab',
      'save_storage_state',
      'verify_url_contains',
    ].includes(step.action);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      className={`group rounded-xl border p-3.5 transition-all shadow-sm ${categoryColor} hover:border-slate-600 bg-[#0d1424] space-y-3`}
    >
      {/* Top Controls Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div
            title="Drag to reorder"
            className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-slate-300"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 font-mono text-[11px] font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-[11px] font-medium text-slate-300">
            {categoryIcon}
            <span className="capitalize">{step.action.replace(/_/g, ' ')}</span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            disabled={index === 0}
            onClick={onMoveUp}
            title="Move Step Up"
            className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800/80 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={index === totalSteps - 1}
            onClick={onMoveDown}
            title="Move Step Down"
            className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800/80 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onCloneStep}
            title="Clone Step"
            className="p-1 rounded text-slate-500 hover:text-emerald-400 hover:bg-slate-800/80 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDeleteStep}
            title="Delete Step"
            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Step Config Form Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs">
        {/* Action Select */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            Action
          </label>
          <select
            value={step.action}
            onChange={(e) => onUpdateStep({ ...step, action: e.target.value })}
            className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <optgroup label="UI Actions">
              {ACTION_CATEGORIES.UI.map((a) => (
                <option key={a.action} value={a.action}>
                  {a.label} ({a.action})
                </option>
              ))}
            </optgroup>
            <optgroup label="Assertions">
              {ACTION_CATEGORIES.ASSERTION.map((a) => (
                <option key={a.action} value={a.action}>
                  {a.label} ({a.action})
                </option>
              ))}
            </optgroup>
            <optgroup label="API Actions">
              {ACTION_CATEGORIES.API.map((a) => (
                <option key={a.action} value={a.action}>
                  {a.label} ({a.action})
                </option>
              ))}
            </optgroup>
            <optgroup label="Flows">
              {ACTION_CATEGORIES.FLOW.map((a) => (
                <option key={a.action} value={a.action}>
                  {a.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Page Selector (for UI & Assertions) */}
        {!isApi && !isFlow && (
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center justify-between">
              <span>Page Object</span>
              {needsElement && !hasLocatorRepo && (
                <span className="text-amber-400 text-[10px] normal-case font-normal">
                  (Repo required)
                </span>
              )}
            </label>
            <SearchableCombobox
              value={step.page || ''}
              onChange={(newPage) => onUpdateStep({ ...step, page: newPage })}
              options={pageOptions}
              disabled={needsElement && !hasLocatorRepo}
              disabledMessage="⚠️ Bind Locator Repo above first"
              placeholder="e.g. LoginPage"
              emptyMessage={
                hasLocatorRepo
                  ? 'No pages defined in repo'
                  : '⚠️ Bind Locator Repo above first'
              }
            />
          </div>
        )}

        {/* Element Selector */}
        {!isApi && !isFlow && (
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center justify-between">
              <span>Element Key</span>
              {needsElement && !hasLocatorRepo ? (
                <span className="text-amber-400 text-[10px] normal-case font-normal">
                  (Repo required)
                </span>
              ) : !step.page ? (
                <span className="text-slate-500 text-[10px] normal-case font-normal">
                  (Select page for suggestions)
                </span>
              ) : null}
            </label>
            <SearchableCombobox
              value={step.element || ''}
              onChange={(newElement) => onUpdateStep({ ...step, element: newElement })}
              options={elementOptions}
              disabled={needsElement && !hasLocatorRepo}
              disabledMessage="⚠️ Bind Locator Repo above first"
              placeholder={
                !step.page
                  ? 'Type element or select page...'
                  : 'Select or type element key...'
              }
              emptyMessage={
                !step.page
                  ? 'Select Page Object above to view elements'
                  : `No elements found for ${step.page}`
              }
            />
          </div>
        )}

        {/* URL Field (for goto, api_*, etc.) */}
        {(step.action === 'goto' || isApi) && (
          <div className="space-y-1 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Target URL
              </label>
              <DynamicTokenPicker
                onSelectToken={(token) =>
                  onUpdateStep({ ...step, url: `${step.url || ''}${token}` })
                }
              />
            </div>
            <input
              type="text"
              placeholder="https://example.com/login"
              value={step.url || ''}
              onChange={(e) => onUpdateStep({ ...step, url: e.target.value })}
              className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
            />
          </div>
        )}

        {/* Value / Data Field */}
        {(step.action === 'fill' ||
          step.action === 'verify_text' ||
          step.action === 'verify_text_contains' ||
          step.action === 'press_key' ||
          step.action === 'select_option') && (
          <div className="space-y-1 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Value / Data
              </label>
              <DynamicTokenPicker
                onSelectToken={(token) =>
                  onUpdateStep({
                    ...step,
                    data: typeof step.data === 'string' ? `${step.data}${token}` : token,
                  })
                }
              />
            </div>
            <input
              type="text"
              placeholder="Input text or assertion target"
              value={step.data !== undefined ? String(step.data) : ''}
              onChange={(e) => onUpdateStep({ ...step, data: e.target.value })}
              className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
            />
          </div>
        )}

        {/* Flow Name (for call_flow) */}
        {isFlow && (
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Sub-Flow JSON File
            </label>
            <input
              type="text"
              placeholder="e.g. login-flow.json"
              value={step.flow || ''}
              onChange={(e) => onUpdateStep({ ...step, flow: e.target.value })}
              className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
            />
          </div>
        )}

        {/* Variable Storage (for store_text) */}
        {step.action === 'store_text' && (
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Store into Variable
            </label>
            <input
              type="text"
              placeholder="variableName"
              value={step.variable || ''}
              onChange={(e) => onUpdateStep({ ...step, variable: e.target.value })}
              className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
            />
          </div>
        )}
      </div>
    </div>
  );
}

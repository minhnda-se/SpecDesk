import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label?: string;
  detail?: string;
  badge?: string;
}

export interface SearchableComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  disabledMessage?: string;
  emptyMessage?: string;
  className?: string;
  inputClassName?: string;
}

export function SearchableCombobox({
  value,
  onChange,
  options = [],
  placeholder = 'Select or type...',
  disabled = false,
  disabledMessage,
  emptyMessage = 'No options available',
  className = '',
  inputClassName = '',
}: SearchableComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter options based on user input
  const filteredOptions = useMemo(() => {
    if (!options || options.length === 0) return [];
    const query = (value || '').trim().toLowerCase();
    if (!query) return options;

    // If typed value is an exact match to an existing option, show all options so user can switch
    const exactMatch = options.some((opt) => opt.value.toLowerCase() === query);
    if (exactMatch) return options;

    return options.filter((opt) => {
      const valMatch = opt.value.toLowerCase().includes(query);
      const labelMatch = opt.label ? opt.label.toLowerCase().includes(query) : false;
      const detailMatch = opt.detail ? opt.detail.toLowerCase().includes(query) : false;
      return valMatch || labelMatch || detailMatch;
    });
  }, [options, value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keep highlighted item in view
  useEffect(() => {
    if (isOpen && highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-combobox-item]');
      const target = items[highlightIndex] as HTMLElement | undefined;
      if (target) {
        target.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex, isOpen]);

  // Reset or adjust highlight index when opening or filtering
  useEffect(() => {
    if (isOpen) {
      const currentIndex = filteredOptions.findIndex(
        (opt) => opt.value.toLowerCase() === (value || '').trim().toLowerCase()
      );
      setHighlightIndex(currentIndex >= 0 ? currentIndex : 0);
    } else {
      setHighlightIndex(-1);
    }
  }, [isOpen, filteredOptions.length]);

  const handleSelectOption = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (filteredOptions.length > 0) {
        setHighlightIndex((prev) => (prev + 1) % filteredOptions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (filteredOptions.length > 0) {
        setHighlightIndex(
          (prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length
        );
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightIndex >= 0 && highlightIndex < filteredOptions.length) {
        e.preventDefault();
        handleSelectOption(filteredOptions[highlightIndex].value);
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${isOpen ? 'z-50' : 'z-10'} ${className}`}
    >
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={value}
          placeholder={disabled && disabledMessage ? disabledMessage : placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onClick={() => {
            if (!disabled && !isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full bg-[#080d1a] border rounded-lg pl-2.5 pr-8 py-1.5 text-slate-200 focus:outline-none transition-colors text-xs ${
            disabled
              ? 'border-amber-500/40 opacity-60 cursor-not-allowed text-amber-300 placeholder-amber-500/70'
              : 'border-slate-700/80 focus:border-emerald-500 hover:border-slate-600'
          } ${inputClassName}`}
        />
        <button
          type="button"
          disabled={disabled}
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (!disabled) {
              setIsOpen((prev) => !prev);
              inputRef.current?.focus();
            }
          }}
          title={isOpen ? 'Close suggestions' : 'Open suggestions'}
          className={`absolute right-1 p-1 rounded hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 transition-transform cursor-pointer ${
            disabled ? 'opacity-30 cursor-not-allowed' : ''
          }`}
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-emerald-400' : ''
            }`}
          />
        </button>
      </div>

      {isOpen && !disabled && (
        <div
          ref={listRef}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-700/90 bg-[#0d1424] shadow-2xl shadow-black/80 z-50 p-1 space-y-0.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 text-center italic">
              {options.length === 0
                ? emptyMessage
                : 'No matching suggestions. Custom value kept.'}
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected =
                (opt.value || '').toLowerCase() === (value || '').trim().toLowerCase();
              const isHighlighted = idx === highlightIndex;

              return (
                <button
                  key={`${opt.value}-${idx}`}
                  type="button"
                  data-combobox-item
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onClick={() => handleSelectOption(opt.value)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between group cursor-pointer ${
                    isHighlighted
                      ? 'bg-emerald-500/15 text-emerald-200'
                      : isSelected
                      ? 'bg-slate-800/90 text-slate-100'
                      : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <div className="flex items-center space-x-1.5 truncate">
                      <span
                        className={`font-medium truncate ${
                          isSelected || isHighlighted
                            ? 'text-emerald-300'
                            : 'text-slate-200'
                        }`}
                      >
                        {opt.label || opt.value}
                      </span>
                      {opt.badge && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800/90 border border-slate-700/80 text-slate-400 font-mono">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {opt.detail && (
                      <span className="text-[10px] text-slate-400 font-mono truncate mt-0.5 group-hover:text-slate-300">
                        {opt.detail}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

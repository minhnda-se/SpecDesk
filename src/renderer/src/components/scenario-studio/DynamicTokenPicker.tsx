import { useState, useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { DYNAMIC_TOKENS } from '../../../../shared/constants';

interface DynamicTokenPickerProps {
  onSelectToken: (token: string) => void;
}

export function DynamicTokenPicker({ onSelectToken }: DynamicTokenPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Insert Dynamic Token"
        className="flex items-center space-x-1 px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs transition-colors cursor-pointer"
      >
        <Sparkles className="w-3 h-3" />
        <span className="font-mono text-[10px]">Token</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#0d1424] border border-purple-500/30 rounded-xl shadow-2xl z-50 p-2 space-y-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[10px] uppercase font-semibold tracking-wider text-purple-400 border-b border-slate-800">
            Dynamic Test Tokens
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1 pt-1">
            {DYNAMIC_TOKENS.map((item) => (
              <button
                key={item.token}
                type="button"
                onClick={() => {
                  onSelectToken(item.token);
                  setIsOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-purple-500/15 text-slate-200 transition-colors flex flex-col group cursor-pointer"
              >
                <span className="font-mono text-xs text-purple-300 group-hover:text-purple-200 font-medium">
                  {item.token}
                </span>
                <span className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

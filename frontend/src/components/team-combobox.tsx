'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { WC2026_TEAMS } from '@/lib/wc2026-teams';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TeamCombobox({ value, onChange, placeholder = 'Seleccionar equipo', disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = WC2026_TEAMS.filter((t) =>
    t.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function select(team: string) {
    onChange(team);
    setOpen(false);
    setQuery('');
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm transition-colors hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={value ? 'text-slate-100' : 'text-slate-500'}>{value || placeholder}</span>
        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <span onClick={clear} className="rounded p-0.5 text-slate-500 hover:text-slate-300 cursor-pointer">
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
          <div className="p-2 border-b border-slate-800">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar equipo…"
              className="w-full rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-500 text-center">Sin resultados</li>
            ) : (
              filtered.map((team) => (
                <li
                  key={team}
                  onClick={() => select(team)}
                  className={`cursor-pointer px-3 py-2 text-sm transition-colors hover:bg-slate-800 ${
                    team === value ? 'text-amber-400 font-medium' : 'text-slate-300'
                  }`}
                >
                  {team}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

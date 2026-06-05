'use client';

import { useEffect, useState } from 'react';
import { Lock, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Match, Prediction } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';
import { getFlag } from '@/lib/flags';
import { cn } from '@/lib/utils';

interface Props {
  match: Match;
  prediction?: Prediction;
  readOnly?: boolean;
  onSaved?: (matchId: string) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function formatMatchDate(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('es-MX', {
      month: 'short',
      day: 'numeric',
      timeZone: 'America/Mexico_City',
    }),
    time: d.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Mexico_City',
    }),
  };
}

function ScoreInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <input
      type="number"
      min={0}
      max={20}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="h-9 w-11 rounded-lg border border-slate-700/80 bg-slate-800/80 text-center font-mono text-sm font-bold text-slate-100 focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
      placeholder="—"
    />
  );
}

export function MatchCard({ match, prediction, readOnly = false, onSaved }: Props) {
  const isPast = new Date(match.scheduledAt) <= new Date();
  const isLocked = readOnly || isPast;
  const [home, setHome] = useState(prediction?.homeScore?.toString() ?? '');
  const [away, setAway] = useState(prediction?.awayScore?.toString() ?? '');
  const [status, setStatus] = useState<SaveStatus>('idle');

  const debouncedHome = useDebounce(home, 1000);
  const debouncedAway = useDebounce(away, 1000);

  const { date, time } = formatMatchDate(match.scheduledAt);

  useEffect(() => {
    if (isLocked) return;
    if (debouncedHome === '' || debouncedAway === '') return;
    const homeVal = parseInt(debouncedHome);
    const awayVal = parseInt(debouncedAway);
    if (isNaN(homeVal) || isNaN(awayVal)) return;
    if (homeVal === prediction?.homeScore && awayVal === prediction?.awayScore) return;

    setStatus('saving');
    api
      .put(`/predictions/${match.id}`, { homeScore: homeVal, awayScore: awayVal })
      .then(() => {
        setStatus('saved');
        onSaved?.(match.id);
        setTimeout(() => setStatus('idle'), 2000);
      })
      .catch(() => {
        setStatus('error');
        toast.error(`Error guardando ${match.homeTeam} vs ${match.awayTeam}`);
        setTimeout(() => setStatus('idle'), 3000);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedHome, debouncedAway]);

  const isLive = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 rounded-xl border px-4 py-3 transition-all',
        isLive
          ? 'border-red-500/30 bg-red-500/5 shadow-sm shadow-red-500/10'
          : isFinished
            ? 'border-slate-800/60 bg-slate-900/40'
            : 'border-slate-800/60 bg-slate-900/30 hover:border-slate-700/60',
        isLocked && !isLive && !isFinished && 'opacity-60',
      )}
    >
      {/* Live indicator */}
      {isLive && (
        <div className="absolute -top-px left-4 flex items-center gap-1.5 rounded-b-md bg-red-500 px-2 py-0.5">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-white">En Vivo</span>
        </div>
      )}

      {/* Date/Time */}
      <div className={cn('w-16 shrink-0 text-center', isLive ? 'mt-3' : '')}>
        <p className="text-[10px] font-medium text-slate-500 uppercase">{date}</p>
        <p className="text-xs font-bold text-slate-400">{time}</p>
      </div>

      {/* Teams + score center */}
      <div className={cn('flex flex-1 items-center justify-between gap-2 min-w-0', isLive ? 'mt-3' : '')}>
        {/* Home team */}
        <div className="flex flex-1 items-center justify-end gap-1.5 min-w-0">
          <span className="truncate text-sm font-semibold text-slate-200 text-right">
            {match.homeTeam}
          </span>
          <span className="text-base shrink-0">{getFlag(match.homeTeam)}</span>
        </div>

        {/* Score / Inputs */}
        {!isLive && !isFinished ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <ScoreInput value={home} onChange={setHome} disabled={isLocked} />
            <span className="text-slate-600 font-bold text-sm">–</span>
            <ScoreInput value={away} onChange={setAway} disabled={isLocked} />
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-800/60 px-3 py-1.5">
              <span className={cn('font-mono text-base font-black', isLive ? 'text-red-400' : 'text-slate-100')}>
                {match.homeScore ?? '–'}
              </span>
              <span className="text-slate-600">:</span>
              <span className={cn('font-mono text-base font-black', isLive ? 'text-red-400' : 'text-slate-100')}>
                {match.awayScore ?? '–'}
              </span>
            </div>
            {/* User's prediction when match is played */}
            {prediction && (
              <div className="hidden sm:flex flex-col items-center">
                <span className="text-[9px] uppercase text-slate-600 font-semibold">tu pick</span>
                <span className="text-xs font-mono text-slate-500">
                  {prediction.homeScore}:{prediction.awayScore}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Away team */}
        <div className="flex flex-1 items-center gap-1.5 min-w-0">
          <span className="text-base shrink-0">{getFlag(match.awayTeam)}</span>
          <span className="truncate text-sm font-semibold text-slate-200">
            {match.awayTeam}
          </span>
        </div>
      </div>

      {/* Status indicator */}
      <div className={cn('flex w-8 shrink-0 items-center justify-center', isLive ? 'mt-3' : '')}>
        {!isLocked && status === 'saving' && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
        )}
        {!isLocked && status === 'saved' && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/15">
            <Check className="h-3 w-3 text-green-400" />
          </div>
        )}
        {!isLocked && status === 'error' && (
          <AlertCircle className="h-3.5 w-3.5 text-red-400" />
        )}
        {isLocked && !isFinished && !isLive && (
          <Lock className="h-3 w-3 text-slate-700" />
        )}
      </div>
    </div>
  );
}

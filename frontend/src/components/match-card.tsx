'use client';

import { useEffect, useState } from 'react';
import { Lock, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Match, Prediction } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props {
  match: Match;
  prediction?: Prediction;
  readOnly?: boolean;
  onSaved?: (matchId: string) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City',
  });
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  LIVE: { label: 'EN VIVO', className: 'bg-red-500 text-white animate-pulse' },
  FINISHED: { label: 'Finalizado', className: 'bg-muted text-muted-foreground' },
  SCHEDULED: { label: '', className: '' },
};

export function MatchCard({ match, prediction, readOnly = false, onSaved }: Props) {
  const isLocked = readOnly || new Date(match.scheduledAt) <= new Date();
  const [home, setHome] = useState(prediction?.homeScore?.toString() ?? '');
  const [away, setAway] = useState(prediction?.awayScore?.toString() ?? '');
  const [status, setStatus] = useState<SaveStatus>('idle');

  const debouncedHome = useDebounce(home, 1000);
  const debouncedAway = useDebounce(away, 1000);

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

  const statusInfo = STATUS_LABELS[match.status];

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors',
        match.status === 'LIVE' && 'border-red-200 bg-red-50',
        isLocked && match.status === 'SCHEDULED' && 'opacity-60',
      )}
    >
      {/* Date */}
      <span className="w-28 shrink-0 text-xs text-muted-foreground">
        {formatDate(match.scheduledAt)}
      </span>

      {/* Teams + score */}
      <div className="flex flex-1 items-center justify-between gap-2">
        <span className="flex-1 text-right font-medium">{match.homeTeam}</span>

        {/* Prediction inputs or actual score */}
        {match.status !== 'SCHEDULED' ? (
          <div className="flex items-center gap-1 font-mono text-base font-bold">
            <span>{match.homeScore ?? '–'}</span>
            <span className="text-muted-foreground">:</span>
            <span>{match.awayScore ?? '–'}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              max={20}
              value={home}
              onChange={(e) => setHome(e.target.value)}
              disabled={isLocked}
              className="h-8 w-12 px-1 text-center font-mono"
              placeholder="–"
            />
            <span className="text-muted-foreground">:</span>
            <Input
              type="number"
              min={0}
              max={20}
              value={away}
              onChange={(e) => setAway(e.target.value)}
              disabled={isLocked}
              className="h-8 w-12 px-1 text-center font-mono"
              placeholder="–"
            />
          </div>
        )}

        <span className="flex-1 font-medium">{match.awayTeam}</span>
      </div>

      {/* Status indicators */}
      <div className="flex w-16 shrink-0 items-center justify-end gap-1">
        {statusInfo?.label && (
          <Badge className={cn('text-xs', statusInfo.className)}>{statusInfo.label}</Badge>
        )}
        {!isLocked && status === 'saving' && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
        {!isLocked && status === 'saved' && (
          <Check className="h-3.5 w-3.5 text-green-500" />
        )}
        {isLocked && match.status === 'SCHEDULED' && (
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        )}

        {/* Show user's prediction when match is played */}
        {match.status !== 'SCHEDULED' && prediction && (
          <span className="text-xs text-muted-foreground">
            ({prediction.homeScore}:{prediction.awayScore})
          </span>
        )}
      </div>
    </div>
  );
}

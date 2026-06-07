'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { LeaderboardEntry } from '@/lib/types';
import { Trophy, RefreshCw, Star, Target, Zap } from 'lucide-react';

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-800/50">
      <div className="h-5 w-5 rounded bg-slate-800 animate-pulse" />
      <div className="h-8 w-8 rounded-full bg-slate-800 animate-pulse" />
      <div className="flex-1 h-4 rounded bg-slate-800 animate-pulse" />
      <div className="h-6 w-12 rounded-lg bg-slate-800 animate-pulse" />
      <div className="hidden sm:block h-4 w-8 rounded bg-slate-800 animate-pulse" />
      <div className="hidden sm:block h-4 w-8 rounded bg-slate-800 animate-pulse" />
    </div>
  );
}

const RANK_STYLES: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  2: { bg: 'bg-slate-400/10', text: 'text-slate-300', border: 'border-slate-400/20' },
  3: { bg: 'bg-orange-700/10', text: 'text-orange-400', border: 'border-orange-700/20' },
};

const MEDALS = ['🥇', '🥈', '🥉'];

function Avatar({ name, rank }: { name: string; rank: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const style = RANK_STYLES[rank];
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
        style ? `${style.bg} ${style.text} ${style.border}` : 'bg-slate-800 text-slate-400 border-slate-700'
      }`}
    >
      {initials}
    </div>
  );
}

export default function LeaderboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const { data, isLoading, dataUpdatedAt } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: () => api.get('/leaderboard').then((r) => r.data),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  if (authLoading || !user) return null;

  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    : null;

  const myRank = data?.find((e) => e.userId === user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-1">Clasificación</p>
          <h1 className="text-2xl font-black text-slate-100">Tabla general</h1>
          {updatedAt && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
              <RefreshCw className="h-3 w-3" />
              Actualizado {updatedAt} · refresca cada 30s
            </p>
          )}
          {/* Legend — arriba para no tener que hacer scroll */}
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Target className="h-3 w-3 text-green-400" />
              Exactas
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Zap className="h-3 w-3 text-blue-400" />
              Ganador
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Star className="h-3 w-3 text-slate-500" />
              Jugados
            </div>
          </div>
        </div>
        {myRank && (
          <div className="shrink-0 rounded-xl border border-slate-800/60 bg-slate-900/50 px-4 py-3 text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-1">Tu posición</p>
            <p className="text-2xl font-black text-slate-100">#{myRank.rank}</p>
            <p className="text-xs font-mono font-bold text-green-400">{myRank.totalPoints} pts</p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : !data?.length ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <Trophy className="h-8 w-8 text-amber-400" />
          </div>
          <p className="text-slate-400 font-medium">Aún no hay puntos registrados</p>
          <p className="text-sm text-slate-600 max-w-xs">
            Los resultados aparecen conforme se juegan los partidos.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/50">
          {/* Table header */}
          <div className="grid grid-cols-[32px_30px_1fr_50px_30px_30px_30px] sm:grid-cols-[48px_40px_1fr_72px_48px_48px_48px] items-center gap-2 border-b border-slate-800 px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">#</div>
            <div />
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Jugador</div>
            <div className="text-center text-[10px] font-bold uppercase tracking-wider text-green-500">Pts</div>
            <div className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-600">
              <Target className="mx-auto h-3 w-3" />
            </div>
            <div className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-600">
              <Zap className="mx-auto h-3 w-3" />
            </div>
            <div className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-600">
              <Star className="mx-auto h-3 w-3" />
            </div>
          </div>

          {data.map((entry, idx) => {
            const isMe = entry.userId === user.id;
            const isTop3 = entry.rank <= 3;
            return (
              <div
                key={entry.userId}
                className={`grid grid-cols-[32px_30px_1fr_50px_30px_30px_30px] sm:grid-cols-[48px_40px_1fr_72px_48px_48px_48px] items-center gap-2 px-4 py-3.5 border-b border-slate-800/50 last:border-0 transition-colors hover:bg-slate-800/30 ${
                  isMe ? 'bg-green-500/8 border-l-[3px] border-l-green-500/60 ring-inset ring-1 ring-green-500/10' : ''
                }`}
              >
                {/* Rank */}
                <div className="text-center">
                  {isTop3 ? (
                    <span className="text-lg">{MEDALS[idx]}</span>
                  ) : (
                    <span className="text-sm font-bold text-slate-600">{entry.rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <Avatar name={entry.name} rank={entry.rank} />

                {/* Name */}
                <div className="min-w-0">
                  <Link
                    href={`/predictions/${entry.userId}`}
                    className="truncate text-sm font-semibold text-slate-200 hover:text-green-400 transition-colors block"
                  >
                    {entry.name}
                  </Link>
                  {isMe && (
                    <span className="text-[10px] font-bold uppercase text-green-500 tracking-wider">Tú</span>
                  )}
                </div>

                {/* Points */}
                <div className="text-center">
                  <span className={`font-mono text-base font-black ${isTop3 ? 'text-amber-400' : 'text-green-400'}`}>
                    {entry.totalPoints}
                  </span>
                </div>

                {/* Exact */}
                <div className="text-center text-xs sm:text-sm font-bold text-green-400">
                  {entry.exactPredictions}
                </div>

                {/* Outcome */}
                <div className="text-center text-xs sm:text-sm font-medium text-blue-400">
                  {entry.outcomePredictions}
                </div>

                {/* Played */}
                <div className="text-center text-xs sm:text-sm text-slate-600">
                  {entry.totalPredictions}
                </div>
              </div>
            );
          })}

        </div>
      )}
    </div>
  );
}

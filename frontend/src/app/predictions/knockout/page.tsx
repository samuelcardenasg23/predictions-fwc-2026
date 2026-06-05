'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Match, Prediction } from '@/lib/types';
import { MatchCard } from '@/components/match-card';
import { Shield, Lock } from 'lucide-react';

const STAGE_CONFIG: Record<string, { label: string; pts: string; color: string }> = {
  R32:         { label: 'Round of 32',       pts: '3 / 1 pt',  color: 'text-slate-400' },
  R16:         { label: 'Octavos de final',  pts: '6 / 2 pts', color: 'text-blue-400' },
  QF:          { label: 'Cuartos de final',  pts: '9 / 3 pts', color: 'text-purple-400' },
  SF:          { label: 'Semifinales',       pts: '12 / 4 pts', color: 'text-amber-400' },
  THIRD_PLACE: { label: 'Tercer lugar',      pts: '12 / 4 pts', color: 'text-amber-400' },
  FINAL:       { label: 'Gran Final',        pts: '15 / 5 pts', color: 'text-amber-400' },
};

const STAGE_ORDER = ['R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL'];

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800/60 bg-slate-900/30 px-4 py-3">
      <div className="h-8 w-16 rounded-lg bg-slate-800 animate-pulse" />
      <div className="flex flex-1 items-center gap-3">
        <div className="h-4 flex-1 rounded bg-slate-800 animate-pulse" />
        <div className="h-9 w-24 rounded-lg bg-slate-800 animate-pulse" />
        <div className="h-4 flex-1 rounded bg-slate-800 animate-pulse" />
      </div>
    </div>
  );
}

export default function KnockoutPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const { data: matches, isLoading: matchesLoading } = useQuery<Match[]>({
    queryKey: ['matches', 'KNOCKOUT'],
    queryFn: () => api.get('/matches?phase=KNOCKOUT').then((r) => r.data),
    enabled: !!user,
  });

  const { data: predictions, isLoading: predsLoading } = useQuery<Prediction[]>({
    queryKey: ['predictions', 'me'],
    queryFn: () => api.get('/predictions/me').then((r) => r.data),
    enabled: !!user,
  });

  const predMap = useMemo(() => {
    const map = new Map<string, Prediction>();
    predictions?.forEach((p) => map.set(p.matchId, p));
    return map;
  }, [predictions]);

  const byStage = useMemo(() => {
    const stages = new Map<string, Match[]>();
    matches?.forEach((m) => {
      if (!stages.has(m.stage)) stages.set(m.stage, []);
      stages.get(m.stage)!.push(m);
    });
    return STAGE_ORDER.filter((s) => stages.has(s)).map((s) => [s, stages.get(s)!] as const);
  }, [matches]);

  if (authLoading || !user) return null;

  const allTbd = matches?.every((m) => m.homeTeam === 'TBD' && m.awayTeam === 'TBD');
  const isLoading = matchesLoading || predsLoading;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-1">Fase eliminatoria</p>
        <h1 className="text-2xl font-black text-slate-100">Knockout</h1>
        <p className="text-sm text-slate-500 mt-1">
          Disponible cuando el administrador active la fase y se conozcan los cruces.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : allTbd ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <Lock className="h-7 w-7 text-slate-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-300">Los cruces aún no están definidos</p>
            <p className="mt-1 text-sm text-slate-600 max-w-xs">
              Vuelve cuando termine la fase de grupos. El administrador habilitará esta sección.
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-400">
            <Shield className="h-3.5 w-3.5" />
            Recibirás un email cuando esté disponible
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {byStage.map(([stage, stageMatches]) => {
            const cfg = STAGE_CONFIG[stage] ?? { label: stage, pts: '', color: 'text-slate-400' };
            return (
              <section key={stage}>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className={`text-xs font-bold uppercase tracking-widest ${cfg.color}`}>
                    {cfg.label}
                  </h2>
                  {cfg.pts && (
                    <span className="rounded-full border border-slate-800 bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {cfg.pts}
                    </span>
                  )}
                  <div className="flex-1 h-px bg-slate-800/60" />
                </div>
                <div className="flex flex-col gap-2">
                  {stageMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      prediction={predMap.get(match.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Match, MatchStage, Prediction } from '@/lib/types';
import { MatchCard } from '@/components/match-card';
import { KnockoutMatchCard } from '@/components/knockout-match-card';
import { ShieldCheck, Trophy, Zap } from 'lucide-react';

const STAGE_ORDER: MatchStage[] = ['R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL'];

const STAGE_LABELS: Record<MatchStage, string> = {
  GROUP: 'Fase de Grupos',
  R32: 'Ronda de 32',
  R16: 'Octavos de Final',
  QF: 'Cuartos de Final',
  SF: 'Semifinales',
  THIRD_PLACE: 'Tercer Lugar',
  FINAL: 'Gran Final',
};

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800/60 bg-slate-900/30 px-4 py-3">
      <div className="h-8 w-14 rounded-lg bg-slate-800 animate-pulse" />
      <div className="flex flex-1 items-center gap-3">
        <div className="h-4 flex-1 rounded bg-slate-800 animate-pulse" />
        <div className="h-9 w-24 rounded-lg bg-slate-800 animate-pulse" />
        <div className="h-4 flex-1 rounded bg-slate-800 animate-pulse" />
      </div>
    </div>
  );
}

export default function KnockoutPredictionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role === 'ADMIN') router.replace('/admin');
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
    const stageMap = new Map<MatchStage, Match[]>();
    matches?.forEach((m) => {
      if (!stageMap.has(m.stage)) stageMap.set(m.stage, []);
      stageMap.get(m.stage)!.push(m);
    });
    return STAGE_ORDER
      .filter((s) => stageMap.has(s))
      .map((s) => [s, stageMap.get(s)!] as [MatchStage, Match[]]);
  }, [matches]);

  const knockoutStarted = useMemo(() => {
    if (!matches || matches.length === 0) return false;
    const r32 = matches.filter((m) => m.stage === 'R32');
    if (r32.length === 0) return false;
    const firstKickoff = Math.min(...r32.map((m) => new Date(m.scheduledAt).getTime()));
    return firstKickoff <= Date.now();
  }, [matches]);

  const knockoutActivated = !!(matches && matches.length > 0);

  const knockoutPreds = predictions?.filter((p) => {
    const m = matches?.find((mx) => mx.id === p.matchId);
    return m?.phase === 'KNOCKOUT';
  }) ?? [];

  const totalKnockout = matches?.length ?? 0;
  const savedCount = knockoutPreds.length + savedIds.size;
  const progress = totalKnockout > 0 ? Math.min(100, Math.round((savedCount / totalKnockout) * 100)) : 0;

  const isLoading = matchesLoading || predsLoading;

  if (authLoading || !user || user.role === 'ADMIN') return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-1">Fase eliminatoria</p>
            <h1 className="text-2xl font-black text-slate-100">Pronósticos Knockout</h1>
            <p className="text-sm text-slate-500 mt-1">
              {knockoutStarted
                ? 'El bracket está cerrado. Los puntos se calculan automáticamente.'
                : knockoutActivated
                  ? 'Elige qué equipos avanzan y el marcador de cada cruce · Se guardan automáticamente'
                  : 'La fase eliminatoria aún no está disponible'}
            </p>
          </div>

          {knockoutActivated && (
            <div className="shrink-0 rounded-xl border border-slate-800/60 bg-slate-900/50 p-3 text-right min-w-[110px]">
              <div className="flex items-center justify-end gap-1.5 mb-2">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-bold text-amber-400">{progress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-600 mt-1.5">{savedCount}/{totalKnockout} guardados</p>
            </div>
          )}
        </div>

        {/* Lock banner */}
        {knockoutStarted && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-400">Bracket bloqueado</p>
              <p className="text-xs text-slate-500">El primer partido ya comenzó. Los pronósticos están cerrados.</p>
            </div>
          </div>
        )}

        {/* Not yet activated */}
        {!knockoutActivated && !isLoading && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-3">
            <Zap className="h-5 w-5 text-slate-600 shrink-0" />
            <p className="text-sm text-slate-500">
              El admin activará la fase eliminatoria cuando terminen los grupos. Te llegará un email.
            </p>
          </div>
        )}

        {/* Rules reminder (open window) */}
        {knockoutActivated && !knockoutStarted && (
          <div className="mt-3 rounded-xl border border-amber-500/15 bg-amber-500/5 px-4 py-2.5">
            <p className="text-xs text-amber-400/80">
              <span className="font-semibold">Reglas:</span>{' '}
              Para octavos en adelante, elige qué equipo crees que avanza de cada cruce + el marcador.
              Equipos y marcador se puntúan de forma independiente — puedes acertar uno sin el otro.
              En partidos que van a penales, solo cuenta el resultado a 90 o 120 minutos.
            </p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : knockoutActivated ? (
        <div className="flex flex-col gap-10">
          {byStage.map(([stage, stageMatches]) => (
            <section key={stage}>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-7 px-2.5 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <span className="text-xs font-black text-amber-400">
                    {stage === 'FINAL' ? '🏆' : stage === 'THIRD_PLACE' ? '🥉' : stage}
                  </span>
                </div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  {STAGE_LABELS[stage]}
                </h2>
                <div className="flex-1 h-px bg-slate-800/60" />
              </div>

              <div className="flex flex-col gap-2">
                {stageMatches.map((match) =>
                  match.stage === 'R32' ? (
                    <MatchCard
                      key={match.id}
                      match={match}
                      prediction={predMap.get(match.id)}
                      globalLocked={knockoutStarted}
                      onSaved={(id) => setSavedIds((s) => new Set(s).add(id))}
                    />
                  ) : (
                    <KnockoutMatchCard
                      key={match.id}
                      match={match}
                      prediction={predMap.get(match.id)}
                      globalLocked={knockoutStarted}
                      onSaved={(id) => setSavedIds((s) => new Set(s).add(id))}
                    />
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

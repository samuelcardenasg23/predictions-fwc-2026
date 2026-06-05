'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Match, Prediction } from '@/lib/types';
import { MatchCard } from '@/components/match-card';
import { Skeleton } from '@/components/ui/skeleton';

const STAGE_LABELS: Record<string, string> = {
  R32: 'Round of 32',
  R16: 'Octavos de final',
  QF: 'Cuartos de final',
  SF: 'Semifinales',
  THIRD_PLACE: 'Tercer lugar',
  FINAL: 'Final',
};

const STAGE_ORDER = ['R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL'];

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Fase eliminatoria</h1>
        <p className="text-sm text-muted-foreground">
          Disponible cuando el administrador active la fase y se conozcan los cruces.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : allTbd ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center text-muted-foreground">
          <p className="text-lg font-medium">Los cruces aún no están definidos</p>
          <p className="text-sm">
            Vuelve cuando termine la fase de grupos para pronosticar los partidos de eliminación directa.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {byStage.map(([stage, stageMatches]) => (
            <section key={stage}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {STAGE_LABELS[stage] ?? stage}
              </h2>
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
          ))}
        </div>
      )}
    </div>
  );
}

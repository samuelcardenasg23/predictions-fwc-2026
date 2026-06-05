'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Match, Prediction } from '@/lib/types';
import { MatchCard } from '@/components/match-card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

export default function PredictionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const { data: matches, isLoading: matchesLoading } = useQuery<Match[]>({
    queryKey: ['matches', 'GROUP_STAGE'],
    queryFn: () => api.get('/matches?phase=GROUP_STAGE').then((r) => r.data),
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

  const byGroup = useMemo(() => {
    const groups = new Map<string, Match[]>();
    matches?.forEach((m) => {
      const key = m.groupName ?? 'Sin grupo';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    });
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [matches]);

  if (authLoading || !user) return null;

  const totalMatches = matches?.length ?? 72;
  const savedCount = (predictions?.length ?? 0) + savedIds.size;
  const progress = Math.min(100, Math.round((savedCount / totalMatches) * 100));
  const isLoading = matchesLoading || predsLoading;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fase de grupos</h1>
          <p className="text-sm text-muted-foreground">
            Los pronósticos se guardan automáticamente. Cierre: antes de cada partido.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-medium">
            {savedCount}/{totalMatches} guardados
          </p>
          <Progress value={progress} className="mt-1 h-2 w-32" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {byGroup.map(([group, groupMatches]) => (
            <section key={group}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Grupo {group}
              </h2>
              <div className="flex flex-col gap-2">
                {groupMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={predMap.get(match.id)}
                    onSaved={(id) => setSavedIds((s) => new Set(s).add(id))}
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

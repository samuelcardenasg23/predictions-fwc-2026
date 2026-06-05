'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Match, Prediction } from '@/lib/types';
import { MatchCard } from '@/components/match-card';
import { Target } from 'lucide-react';

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800/60 bg-slate-900/30 px-4 py-3">
      <div className="h-8 w-16 rounded-lg bg-slate-800 animate-pulse" />
      <div className="flex flex-1 items-center gap-3">
        <div className="h-4 flex-1 rounded bg-slate-800 animate-pulse" />
        <div className="h-9 w-24 rounded-lg bg-slate-800 animate-pulse" />
        <div className="h-4 flex-1 rounded bg-slate-800 animate-pulse" />
      </div>
      <div className="h-4 w-8 rounded bg-slate-800 animate-pulse" />
    </div>
  );
}

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
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-green-500 mb-1">Fase de grupos</p>
          <h1 className="text-2xl font-black text-slate-100">Mis pronósticos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Se guardan automáticamente · Cierre antes de cada partido
          </p>
        </div>

        {/* Progress */}
        <div className="shrink-0 rounded-xl border border-slate-800/60 bg-slate-900/50 p-3 text-right min-w-[110px]">
          <div className="flex items-center justify-end gap-1.5 mb-2">
            <Target className="h-3.5 w-3.5 text-green-400" />
            <span className="text-xs font-bold text-green-400">{progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-600 mt-1.5">{savedCount}/{totalMatches} guardados</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {byGroup.map(([group, groupMatches]) => (
            <section key={group}>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20">
                  <span className="text-xs font-black text-green-400">{group}</span>
                </div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Grupo {group}
                </h2>
                <div className="flex-1 h-px bg-slate-800/60" />
              </div>
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

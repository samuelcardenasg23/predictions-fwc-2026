'use client';

import { use, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Prediction } from '@/lib/types';
import { MatchCard } from '@/components/match-card';
import { Eye } from 'lucide-react';

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

export default function UserPredictionsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const { data: predictions, isLoading } = useQuery<Prediction[]>({
    queryKey: ['predictions', 'user', userId],
    queryFn: () => api.get(`/predictions/user/${userId}`).then((r) => r.data),
    enabled: !!user,
  });

  const byGroup = useMemo(() => {
    const groups = new Map<string, Prediction[]>();
    predictions?.forEach((p) => {
      if (!p.match) return;
      const key = p.match.groupName ?? p.match.stage;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    });
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [predictions]);

  if (authLoading || !user) return null;

  const isOwnProfile = userId === user.id;
  const ownerName = predictions?.[0]?.match ? 'este jugador' : 'este jugador';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            {isOwnProfile ? 'Tu historial' : 'Vista de solo lectura'}
          </p>
          <div className="flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-600">
            <Eye className="h-2.5 w-2.5" />
            Solo lectura
          </div>
        </div>
        <h1 className="text-2xl font-black text-slate-100">
          Pronósticos de {isOwnProfile ? 'mis picks' : ownerName}
        </h1>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : predictions?.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <p className="text-slate-400 font-medium">Sin pronósticos registrados</p>
          <p className="text-sm text-slate-600">Este usuario aún no ha guardado ningún pronóstico.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {byGroup.map(([group, preds]) => (
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
                {preds.map((pred) =>
                  pred.match ? (
                    <MatchCard key={pred.id} match={pred.match} prediction={pred} readOnly />
                  ) : null,
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

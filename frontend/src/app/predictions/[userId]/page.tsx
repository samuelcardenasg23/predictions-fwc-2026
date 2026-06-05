'use client';

import { use, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Prediction } from '@/lib/types';
import { MatchCard } from '@/components/match-card';
import { Skeleton } from '@/components/ui/skeleton';

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

  const ownerName = predictions?.find((p) => p.userId !== user.id)
    ? 'este jugador'
    : 'tus pronósticos';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pronósticos de {ownerName}</h1>
        <p className="text-sm text-muted-foreground">Vista de solo lectura</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : predictions?.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          Este usuario aún no ha registrado pronósticos.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {byGroup.map(([group, preds]) => (
            <section key={group}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Grupo {group}
              </h2>
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

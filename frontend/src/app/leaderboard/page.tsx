'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { LeaderboardEntry } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw } from 'lucide-react';

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tabla general</h1>
          {updatedAt && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              Actualizado {updatedAt} · refresca cada 30s
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : !data?.length ? (
        <p className="py-12 text-center text-muted-foreground">
          Aún no hay puntos registrados. Los resultados aparecen conforme se juegan los partidos.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">#</th>
                <th className="px-4 py-3 text-left font-semibold">Jugador</th>
                <th className="px-4 py-3 text-center font-semibold">Pts</th>
                <th className="hidden px-4 py-3 text-center font-semibold sm:table-cell">Exactas</th>
                <th className="hidden px-4 py-3 text-center font-semibold sm:table-cell">Ganador</th>
                <th className="hidden px-4 py-3 text-center font-semibold sm:table-cell">Jugados</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((entry) => (
                <tr
                  key={entry.userId}
                  className={`transition-colors hover:bg-muted/50 ${
                    entry.userId === user?.id ? 'bg-primary/5 font-semibold' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    {MEDAL[entry.rank] ?? <span className="text-muted-foreground">{entry.rank}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/predictions/${entry.userId}`} className="hover:underline">
                      {entry.name}
                    </Link>
                    {entry.userId === user?.id && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Tú
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-primary">
                    {entry.totalPoints}
                  </td>
                  <td className="hidden px-4 py-3 text-center text-green-600 sm:table-cell">
                    {entry.exactPredictions}
                  </td>
                  <td className="hidden px-4 py-3 text-center text-blue-600 sm:table-cell">
                    {entry.outcomePredictions}
                  </td>
                  <td className="hidden px-4 py-3 text-center text-muted-foreground sm:table-cell">
                    {entry.totalPredictions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

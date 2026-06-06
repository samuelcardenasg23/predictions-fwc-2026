'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Match, MatchStatus } from '@/lib/types';
import { Flag } from '@/components/flag';
import { toast } from 'sonner';

const STATUS_LABELS: Record<MatchStatus, string> = {
  SCHEDULED: 'Programado',
  LIVE: 'En vivo',
  FINISHED: 'Finalizado',
};

const STAGE_LABELS: Record<string, string> = {
  GROUP: 'Fase de grupos',
  R32: 'Ronda de 32',
  R16: 'Octavos de final',
  QF: 'Cuartos de final',
  SF: 'Semifinal',
  THIRD_PLACE: 'Tercer lugar',
  FINAL: 'Final',
};

function MatchRow({ match, onSaved }: { match: Match; onSaved: () => void }) {
  const [homeScore, setHomeScore] = useState(match.homeScore?.toString() ?? '');
  const [awayScore, setAwayScore] = useState(match.awayScore?.toString() ?? '');
  const [status, setStatus] = useState<MatchStatus>(match.status);
  const [saving, setSaving] = useState(false);

  const scheduledDate = new Date(match.scheduledAt).toLocaleString('es-MX', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  async function save() {
    const home = homeScore === '' ? undefined : parseInt(homeScore, 10);
    const away = awayScore === '' ? undefined : parseInt(awayScore, 10);

    if (home !== undefined && (isNaN(home) || home < 0)) {
      toast.error('Goles local inválidos');
      return;
    }
    if (away !== undefined && (isNaN(away) || away < 0)) {
      toast.error('Goles visitante inválidos');
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/matches/${match.id}`, {
        ...(home !== undefined ? { homeScore: home } : {}),
        ...(away !== undefined ? { awayScore: away } : {}),
        status,
      });
      toast.success(`${match.homeTeam} vs ${match.awayTeam} — resultado guardado`);
      onSaved();
    } catch {
      toast.error('Error al guardar el resultado');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto_auto] items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
      {/* Home team */}
      <div className="flex items-center justify-end gap-2 min-w-0">
        <span className="truncate text-sm font-medium text-slate-100 text-right hidden sm:block">{match.homeTeam}</span>
        <Flag country={match.homeTeam} size={32} />
      </div>

      {/* Score inputs */}
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          value={homeScore}
          onChange={(e) => setHomeScore(e.target.value)}
          className="w-12 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-center text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          placeholder="–"
        />
        <span className="text-slate-500 text-xs">–</span>
        <input
          type="number"
          min={0}
          value={awayScore}
          onChange={(e) => setAwayScore(e.target.value)}
          className="w-12 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-center text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          placeholder="–"
        />
      </div>

      {/* Away team */}
      <div className="flex items-center gap-2 min-w-0">
        <Flag country={match.awayTeam} size={32} />
        <span className="truncate text-sm font-medium text-slate-100 hidden sm:block">{match.awayTeam}</span>
      </div>

      {/* Status + date */}
      <div className="flex flex-col items-end gap-1">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as MatchStatus)}
          className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          style={{ color: status === 'LIVE' ? '#4ade80' : status === 'FINISHED' ? '#60a5fa' : '#94a3b8' }}
        >
          {(['SCHEDULED', 'LIVE', 'FINISHED'] as MatchStatus[]).map((s) => (
            <option key={s} value={s} className="text-white bg-slate-800">
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500">{scheduledDate}</span>
      </div>

      {/* Save button */}
      <button
        onClick={save}
        disabled={saving}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  );
}

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  const { data: matches, isLoading: loadingMatches } = useQuery<Match[]>({
    queryKey: ['admin-matches'],
    queryFn: () => api.get('/matches').then((r) => r.data),
    enabled: !!user && user.role === 'ADMIN',
    staleTime: 0,
  });

  if (isLoading || !user || user.role !== 'ADMIN') return null;

  const grouped = (matches ?? []).reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.stage;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const stageOrder = ['GROUP', 'R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL'];
  const sortedStages = Object.keys(grouped).sort(
    (a, b) => stageOrder.indexOf(a) - stageOrder.indexOf(b),
  );

  const total = matches?.length ?? 0;
  const withScore = matches?.filter((m) => m.homeScore !== null).length ?? 0;
  const live = matches?.filter((m) => m.status === 'LIVE').length ?? 0;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin-matches'] });
    queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    queryClient.invalidateQueries({ queryKey: ['matches'] });
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Panel Admin — Resultados</h1>
        <p className="mt-1 text-sm text-slate-400">
          Ingresa o corrige resultados manualmente. Los cambios se reflejan en el leaderboard inmediatamente.
        </p>
        {!loadingMatches && (
          <div className="mt-3 flex gap-4 text-xs text-slate-500">
            <span>{total} partidos totales</span>
            <span className="text-blue-400">{withScore} con resultado</span>
            {live > 0 && <span className="text-green-400">{live} en vivo</span>}
          </div>
        )}
      </div>

      {loadingMatches ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {sortedStages.map((stage) => (
            <section key={stage}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                {STAGE_LABELS[stage] ?? stage}
              </h2>
              <div className="space-y-2">
                {grouped[stage].map((match) => (
                  <MatchRow key={match.id} match={match} onSaved={invalidate} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

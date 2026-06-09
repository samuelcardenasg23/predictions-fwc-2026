'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Match, MatchStage, KnockoutStageStatus, Prediction } from '@/lib/types';
import { MatchCard } from '@/components/match-card';
import { Lock, Zap } from 'lucide-react';

// ─── constants ───────────────────────────────────────────────────────────────

const KNOCKOUT_STAGES: MatchStage[] = ['R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL'];

const STAGE_LABELS: Record<MatchStage, string> = {
  GROUP: 'Grupos',
  R32: 'Fase de 32',
  R16: 'Octavos',
  QF: 'Cuartos',
  SF: 'Semis',
  THIRD_PLACE: '3er Lugar',
  FINAL: 'Final',
};

const SLUG_TO_STAGE: Record<string, MatchStage> = {
  r32: 'R32',
  r16: 'R16',
  qf: 'QF',
  sf: 'SF',
  'third-place': 'THIRD_PLACE',
  final: 'FINAL',
};

const STAGE_TO_SLUG: Record<MatchStage, string> = {
  GROUP: '',
  R32: 'r32',
  R16: 'r16',
  QF: 'qf',
  SF: 'sf',
  THIRD_PLACE: 'third-place',
  FINAL: 'final',
};

// ─── tab bar ─────────────────────────────────────────────────────────────────

function StageTabs({
  current,
  statuses,
}: {
  current: MatchStage;
  statuses: Record<MatchStage, KnockoutStageStatus>;
}) {
  const router = useRouter();

  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-900/40 p-1">
      {KNOCKOUT_STAGES.map((stage) => {
        const status = statuses[stage];
        const isActive = stage === current;
        const isInactive = status === 'inactive';

        let tabCls =
          'flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ';

        if (isActive) {
          tabCls += 'bg-amber-500 text-black';
        } else if (isInactive) {
          tabCls += 'cursor-not-allowed text-slate-600';
        } else {
          tabCls += 'cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-slate-800';
        }

        const indicator =
          status === 'open' ? ' 🟢' : status === 'locked' ? ' 🔒' : '';

        return (
          <button
            key={stage}
            className={tabCls}
            disabled={isInactive}
            onClick={() => !isInactive && router.push(`/predictions/knockout/${STAGE_TO_SLUG[stage]}`)}
          >
            {STAGE_LABELS[stage]}
            {indicator}
          </button>
        );
      })}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function KnockoutStagePage() {
  const { user, token } = useAuth();
  const params = useParams<{ stage: string }>();
  const slug = params.stage ?? 'r32';
  const stage = SLUG_TO_STAGE[slug];

  // Stage statuses for tab bar
  const { data: statuses } = useQuery<Record<MatchStage, KnockoutStageStatus>>({
    queryKey: ['stages-status'],
    queryFn: () => api.get('/admin/stages/status').then((r) => r.data),
    staleTime: 30_000,
    enabled: !!token,
  });

  // Matches for this stage
  const { data: allMatches = [], isLoading: loadingMatches } = useQuery<Match[]>({
    queryKey: ['matches-knockout', stage],
    queryFn: () =>
      api.get('/matches', { params: { phase: 'KNOCKOUT' } }).then((r) =>
        (r.data as Match[]).filter((m) => m.stage === stage),
      ),
    staleTime: 60_000,
    enabled: !!token && !!stage,
  });

  // User predictions for knockout
  const { data: predictions = [] } = useQuery<Prediction[]>({
    queryKey: ['predictions', user?.id],
    queryFn: () => api.get('/predictions/me').then((r) => r.data),
    staleTime: 30_000,
    enabled: !!token,
  });

  const predMap = useMemo(() => {
    const map = new Map<string, Prediction>();
    for (const p of predictions) map.set(p.matchId, p);
    return map;
  }, [predictions]);

  const stageStatus = statuses?.[stage ?? 'R32'];
  const isLocked = stageStatus === 'locked';
  const isInactive = !stage || stageStatus === 'inactive' || stageStatus === undefined;

  const completed = allMatches.filter((m) => predMap.has(m.id)).length;
  const total = allMatches.length;

  if (!stage) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-slate-400">Fase no reconocida.</p>
      </div>
    );
  }

  const defaultStatuses = Object.fromEntries(
    KNOCKOUT_STAGES.map((s) => [s, 'inactive' as KnockoutStageStatus]),
  ) as Record<MatchStage, KnockoutStageStatus>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      {/* Tab bar */}
      <StageTabs current={stage} statuses={statuses ?? defaultStatuses} />

      {/* Stage title */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">
          {STAGE_LABELS[stage]}
        </h1>
        {!isInactive && !loadingMatches && total > 0 && (
          <p className="mt-0.5 text-sm text-slate-400">
            {completed}/{total} pronosticados
          </p>
        )}
      </div>

      {/* Progress bar */}
      {!isInactive && !loadingMatches && total > 0 && (
        <div className="h-1.5 w-full rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
      )}

      {/* Status banners */}
      {isInactive && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-800/60 bg-slate-900/30 px-6 py-10 text-center">
          <Zap className="h-8 w-8 text-slate-500" />
          <p className="text-slate-400">
            Esta fase aún no está activada. El admin la abrirá cuando estén definidos los equipos.
          </p>
        </div>
      )}

      {isLocked && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <Lock className="h-4 w-4 shrink-0" />
          Los pronósticos de esta fase están cerrados — ya arrancaron los partidos.
        </div>
      )}

      {/* Loading skeletons */}
      {!isInactive && loadingMatches && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl border border-slate-800/60 bg-slate-900/30 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* No matches yet (stage activated but admin hasn't created matches) */}
      {!isInactive && !loadingMatches && total === 0 && (
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 px-6 py-8 text-center text-sm text-slate-400">
          Partidos pendientes de confirmación.
        </div>
      )}

      {/* Match cards */}
      {!isInactive && !loadingMatches && total > 0 && (
        <div className="space-y-3">
          {allMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              prediction={predMap.get(match.id)}
              globalLocked={isLocked}
            />
          ))}
        </div>
      )}
    </div>
  );
}

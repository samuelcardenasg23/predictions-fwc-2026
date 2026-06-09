'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Match, MatchPhase, MatchStage, KnockoutStageStatus, Prediction } from '@/lib/types';
import { MatchCard } from '@/components/match-card';
import { Eye, Zap } from 'lucide-react';

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

type ViewPhase = 'GROUP' | MatchStage;

// ─── tab bar ─────────────────────────────────────────────────────────────────

function ViewerPhaseTabs({
  current,
  statuses,
  onChange,
}: {
  current: ViewPhase;
  statuses: Record<MatchStage, KnockoutStageStatus> | undefined;
  onChange: (phase: ViewPhase) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-900/40 p-1">
      <button
        className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
          current === 'GROUP'
            ? 'bg-amber-500 text-black'
            : 'cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }`}
        onClick={() => onChange('GROUP')}
      >
        Grupos
      </button>

      {KNOCKOUT_STAGES.map((stage) => {
        const status = statuses?.[stage] ?? 'inactive';
        const isActive = stage === current;
        const isInactive = status === 'inactive';

        let tabCls =
          'flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ';
        if (isActive) tabCls += 'bg-amber-500 text-black';
        else if (isInactive) tabCls += 'cursor-not-allowed text-slate-600';
        else tabCls += 'cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-slate-800';

        const indicator = status === 'open' ? ' 🟢' : status === 'locked' ? ' 🔒' : '';

        return (
          <button
            key={stage}
            className={tabCls}
            disabled={isInactive}
            onClick={() => !isInactive && onChange(stage)}
          >
            {STAGE_LABELS[stage]}
            {indicator}
          </button>
        );
      })}
    </div>
  );
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

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

// ─── page ─────────────────────────────────────────────────────────────────────

export default function UserPredictionsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [currentPhase, setCurrentPhase] = useState<ViewPhase>('GROUP');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const { data: statuses } = useQuery<Record<MatchStage, KnockoutStageStatus>>({
    queryKey: ['stages-status'],
    staleTime: 30_000,
    queryFn: () => api.get('/matches/stages/status').then((r) => r.data),
    enabled: !!user,
  });

  const { data: predictions, isLoading } = useQuery<Prediction[]>({
    queryKey: ['predictions', 'user', userId],
    queryFn: () => api.get(`/predictions/user/${userId}`).then((r) => r.data),
    enabled: !!user,
  });

  // Fetch target user name from leaderboard data (already public)
  const { data: leaderboard } = useQuery<{ userId: string; name: string }[]>({
    queryKey: ['leaderboard'],
    queryFn: () => api.get('/leaderboard').then((r) => r.data),
    staleTime: 30_000,
    enabled: !!user,
  });

  const targetName = useMemo(() => {
    if (userId === user?.id) return null;
    return leaderboard?.find((e) => e.userId === userId)?.name ?? 'este jugador';
  }, [leaderboard, userId, user?.id]);

  // Predictions split by phase
  const groupPredictions = useMemo(
    () => predictions?.filter((p) => p.match?.phase === ('GROUP_STAGE' as MatchPhase)) ?? [],
    [predictions],
  );

  const knockoutByStage = useMemo(() => {
    const map = new Map<MatchStage, Prediction[]>();
    predictions
      ?.filter((p) => p.match?.phase === ('KNOCKOUT' as MatchPhase))
      .forEach((p) => {
        const s = p.match!.stage;
        if (!map.has(s)) map.set(s, []);
        map.get(s)!.push(p);
      });
    return map;
  }, [predictions]);

  // Group stage: group by groupName
  const byGroup = useMemo(() => {
    const groups = new Map<string, Prediction[]>();
    groupPredictions.forEach((p) => {
      const key = p.match?.groupName ?? '?';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    });
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [groupPredictions]);

  const isViewingKnockout = currentPhase !== 'GROUP';
  const knockoutPreds = isViewingKnockout ? (knockoutByStage.get(currentPhase) ?? []) : [];
  const knockoutStatus = isViewingKnockout ? statuses?.[currentPhase] : undefined;
  const knockoutInactive = knockoutStatus === 'inactive' || knockoutStatus === undefined;

  if (authLoading || !user) return null;

  const isOwnProfile = userId === user.id;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
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
          Pronósticos de {isOwnProfile ? 'mis picks' : targetName}
        </h1>
      </div>

      {/* Phase tabs */}
      <div className="mb-6">
        <ViewerPhaseTabs
          current={currentPhase}
          statuses={statuses}
          onChange={setCurrentPhase}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : currentPhase === 'GROUP' ? (
        // ── Group stage view ──────────────────────────────────────────────────
        groupPredictions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <p className="text-slate-400 font-medium">Sin pronósticos de grupos</p>
            <p className="text-sm text-slate-600">Este usuario aún no ha guardado predicciones.</p>
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
        )
      ) : (
        // ── Knockout stage view ───────────────────────────────────────────────
        knockoutInactive ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-800/60 bg-slate-900/30 px-6 py-10 text-center">
            <Zap className="h-8 w-8 text-slate-500" />
            <p className="text-slate-400">Esta fase aún no está activada.</p>
          </div>
        ) : knockoutPreds.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <p className="text-slate-400 font-medium">Sin pronósticos en esta fase</p>
            <p className="text-sm text-slate-600">Este usuario no ha registrado predicciones aquí.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs font-black text-amber-400">
                  {(currentPhase as string).charAt(0)}
                </span>
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                {STAGE_LABELS[currentPhase as MatchStage]}
              </h2>
              <div className="flex-1 h-px bg-slate-800/60" />
            </div>
            {knockoutPreds.map((pred) =>
              pred.match ? (
                <MatchCard key={pred.id} match={pred.match} prediction={pred} readOnly />
              ) : null,
            )}
          </div>
        )
      )}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Match, MatchStage, KnockoutStageStatus, Prediction, UserStageLock } from '@/lib/types';
import { MatchCard } from '@/components/match-card';
import { PredictionsPhaseNav } from '@/components/predictions-phase-nav';
import { Lock, Zap, Target, Trash2, ShieldCheck, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

// ─── constants ───────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<MatchStage, string> = {
  GROUP: 'Grupos',
  R32: 'Fase de 32',
  R16: 'Octavos de final',
  QF: 'Cuartos de final',
  SF: 'Semifinales',
  THIRD_PLACE: 'Tercer lugar',
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

// ─── confirm modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  open,
  onClose,
  onConfirm,
  loading,
  variant,
  stageName,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  variant: 'lock' | 'clear';
  stageName: string;
}) {
  if (!open) return null;

  const isLock = variant === 'lock';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
              isLock
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}
          >
            {isLock ? (
              <ShieldCheck className="h-5 w-5 text-green-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-400" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-slate-100">
              {isLock ? `Finalizar — ${stageName}` : 'Borrar pronósticos'}
            </h3>
            <p className="text-xs text-slate-500">Esta acción no se puede deshacer</p>
          </div>
        </div>

        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          {isLock
            ? `Al confirmar, tus pronósticos de ${stageName} quedarán bloqueados permanentemente. Ya no podrás editarlos, ni siquiera antes de que empiecen los partidos.`
            : `Se eliminarán todos tus pronósticos de ${stageName}. Tendrás que volver a ingresarlos antes de que arranquen los partidos.`}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all disabled:opacity-50 ${
              isLock
                ? 'bg-green-500 text-slate-950 hover:bg-green-400'
                : 'bg-red-500 text-white hover:bg-red-400'
            }`}
          >
            {loading
              ? 'Procesando...'
              : isLock
              ? 'Sí, finalizar'
              : 'Sí, borrar todo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function KnockoutStagePage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const params = useParams<{ stage: string }>();
  const slug = params.stage ?? 'r32';
  const stage = SLUG_TO_STAGE[slug];

  const [modal, setModal] = useState<'lock' | 'clear' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [clearTrigger, setClearTrigger] = useState(0);

  const { data: statuses } = useQuery<Record<MatchStage, KnockoutStageStatus>>({
    queryKey: ['stages-status'],
    staleTime: 30_000,
    queryFn: () => api.get('/matches/stages/status').then((r) => r.data),
    enabled: !!token,
  });

  const { data: stageLocks = [] } = useQuery<UserStageLock[]>({
    queryKey: ['my-stage-locks'],
    queryFn: () => api.get('/predictions/my-stage-locks').then((r) => r.data),
    staleTime: 60_000,
    enabled: !!token,
  });

  const { data: allMatches = [], isLoading: loadingMatches } = useQuery<Match[]>({
    queryKey: ['matches-knockout', stage],
    queryFn: () =>
      api.get('/matches', { params: { phase: 'KNOCKOUT' } }).then((r) =>
        (r.data as Match[]).filter((m) => m.stage === stage),
      ),
    staleTime: 60_000,
    enabled: !!token && !!stage,
  });

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
  const isAutoLocked = stageStatus === 'locked';
  const isInactive = !stage || stageStatus === 'inactive' || stageStatus === undefined;
  const isUserLocked = stageLocks.some((l) => l.stage === stage);
  const isLocked = isAutoLocked || isUserLocked;

  const total = allMatches.length;
  const saved = allMatches.filter((m) => predMap.has(m.id)).length + savedIds.size;
  const progress = total > 0 ? Math.min(100, Math.round((saved / total) * 100)) : 0;

  const handleLock = async () => {
    setActionLoading(true);
    try {
      await api.post(`/predictions/lock-stage/${stage}`);
      queryClient.invalidateQueries({ queryKey: ['my-stage-locks'] });
      setModal(null);
      toast.success(`¡Pronósticos de ${STAGE_LABELS[stage!]} finalizados!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al finalizar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClear = async () => {
    setActionLoading(true);
    try {
      await api.delete(`/predictions/me/stage/${stage}`);
      setSavedIds(new Set());
      setClearTrigger((t) => t + 1);
      queryClient.setQueryData(['predictions', user?.id], (prev: Prediction[] = []) =>
        prev.filter((p) => !allMatches.some((m) => m.id === p.matchId)),
      );
      setModal(null);
      toast.success('Pronósticos eliminados. Puedes volver a empezar.');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al eliminar');
    } finally {
      setActionLoading(false);
    }
  };

  if (!stage) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-slate-400">Fase no reconocida.</p>
      </div>
    );
  }

  return (
    <>
      <ConfirmModal
        open={modal !== null}
        onClose={() => setModal(null)}
        onConfirm={modal === 'lock' ? handleLock : handleClear}
        loading={actionLoading}
        variant={modal ?? 'lock'}
        stageName={STAGE_LABELS[stage]}
      />

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        {/* Phase tab navigation */}
        <PredictionsPhaseNav current={stage} />

        {/* Header */}
        <div className="mb-2">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-1">
                Fase eliminatoria
              </p>
              <h1 className="text-2xl font-black text-slate-100">{STAGE_LABELS[stage]}</h1>
              <p className="text-sm text-slate-500 mt-1">
                {isLocked
                  ? isUserLocked
                    ? 'Tus predicciones están finalizadas y bloqueadas.'
                    : 'Los partidos ya arrancaron — pronósticos cerrados.'
                  : isInactive
                  ? 'Esta fase aún no está activada.'
                  : 'Se guardan automáticamente · Cierre antes de cada partido'}
              </p>
            </div>

            {/* Progress */}
            {!isInactive && total > 0 && (
              <div className="shrink-0 rounded-xl border border-slate-800/60 bg-slate-900/50 p-3 text-right min-w-[110px]">
                <div className="flex items-center justify-end gap-1.5 mb-2">
                  <Target className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-amber-400">{progress}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-600 mt-1.5">{saved}/{total} guardados</p>
              </div>
            )}
          </div>

          {/* Lock banner or action buttons */}
          {!isInactive && (
            isLocked ? (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
                <ShieldCheck className="h-5 w-5 text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-400">Pronósticos bloqueados</p>
                  <p className="text-xs text-slate-500">
                    {isUserLocked
                      ? `Finalizados el ${new Date(
                          stageLocks.find((l) => l.stage === stage)!.lockedAt,
                        ).toLocaleDateString('es-CO', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'America/Bogota',
                        })}`
                      : 'Los partidos ya arrancaron — el cierre fue automático.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setModal('lock')}
                  disabled={saved === 0}
                  className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/20"
                >
                  <Lock className="h-4 w-4" />
                  Finalizar predicciones
                </button>
                <button
                  onClick={() => setModal('clear')}
                  disabled={saved === 0}
                  className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-400 hover:border-red-500/40 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Borrar todo
                </button>
              </div>
            )
          )}
        </div>

        {/* Inactive state */}
        {isInactive && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-800/60 bg-slate-900/30 px-6 py-10 text-center">
            <Zap className="h-8 w-8 text-slate-500" />
            <p className="text-slate-400">
              Esta fase aún no está activada. El admin la abrirá cuando estén definidos los equipos.
            </p>
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

        {/* No matches yet */}
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
                clearTrigger={clearTrigger}
                onSaved={(id) => setSavedIds((s) => new Set(s).add(id))}
              />
            ))}
          </div>
        )}

        {/* Bottom borrar todo */}
        {!isInactive && !isLocked && total > 0 && (
          <div className="border-t border-slate-800/60 pt-6 flex flex-wrap gap-2">
            <button
              onClick={() => setModal('lock')}
              disabled={saved === 0}
              className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/20"
            >
              <Lock className="h-4 w-4" />
              Finalizar predicciones
            </button>
            <button
              onClick={() => setModal('clear')}
              disabled={saved === 0}
              className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-400 hover:border-red-500/40 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Borrar todo
            </button>
          </div>
        )}
      </div>
    </>
  );
}

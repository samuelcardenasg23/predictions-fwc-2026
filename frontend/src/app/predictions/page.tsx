'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Match, Prediction } from '@/lib/types';
import { MatchCard } from '@/components/match-card';
import { Target, Lock, Trash2, ShieldCheck, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800/60 bg-slate-900/30 px-4 py-3">
      <div className="h-8 w-14 rounded-lg bg-slate-800 animate-pulse" />
      <div className="flex flex-1 items-center gap-3">
        <div className="h-4 flex-1 rounded bg-slate-800 animate-pulse" />
        <div className="h-9 w-24 rounded-lg bg-slate-800 animate-pulse" />
        <div className="h-4 flex-1 rounded bg-slate-800 animate-pulse" />
      </div>
    </div>
  );
}

function ConfirmModal({
  open,
  onClose,
  onConfirm,
  loading,
  variant,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  variant: 'lock' | 'clear';
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
              {isLock ? 'Finalizar predicciones' : 'Borrar todas las predicciones'}
            </h3>
            <p className="text-xs text-slate-500">Esta acción {isLock ? 'no se puede deshacer' : 'es irreversible'}</p>
          </div>
        </div>

        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          {isLock
            ? 'Al confirmar, tus pronósticos de la fase de grupos quedarán bloqueados permanentemente. Ya no podrás editarlos, ni siquiera antes de que empiecen los partidos. Esto evita que puedas copiar las predicciones de otros participantes.'
            : 'Se eliminarán todos tus pronósticos guardados. Tendrás que volver a ingresar tus predicciones desde cero antes del inicio del torneo.'}
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

export default function PredictionsPage() {
  const { user, login, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<'lock' | 'clear' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [clearTrigger, setClearTrigger] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role === 'ADMIN') router.replace('/admin');
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

  const isGloballyLocked = !!user?.groupStageLockedAt;

  const handleLock = async () => {
    setActionLoading(true);
    try {
      await api.post('/predictions/lock-group-stage');
      // Update user in auth context with new lock timestamp
      if (user && token) {
        login(token, { ...user, groupStageLockedAt: new Date().toISOString() });
      }
      setModal(null);
      toast.success('¡Predicciones finalizadas! Ya no pueden ser modificadas.');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al finalizar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClear = async () => {
    setActionLoading(true);
    try {
      await api.delete('/predictions/me');
      setSavedIds(new Set());
      setClearTrigger((t) => t + 1);
      queryClient.setQueryData(['predictions', 'me'], []);
      queryClient.invalidateQueries({ queryKey: ['predictions', 'me'] });
      setModal(null);
      toast.success('Predicciones eliminadas. Puedes volver a empezar.');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al eliminar');
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || !user || user.role === 'ADMIN') return null;

  const totalMatches = matches?.length ?? 72;
  const savedCount = (predictions?.length ?? 0) + savedIds.size;
  const progress = Math.min(100, Math.round((savedCount / totalMatches) * 100));
  const isLoading = matchesLoading || predsLoading;

  return (
    <>
      <ConfirmModal
        open={modal === 'lock'}
        onClose={() => setModal(null)}
        onConfirm={handleLock}
        loading={actionLoading}
        variant="lock"
      />
      <ConfirmModal
        open={modal === 'clear'}
        onClose={() => setModal(null)}
        onConfirm={handleClear}
        loading={actionLoading}
        variant="clear"
      />

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-green-500 mb-1">Fase de grupos</p>
              <h1 className="text-2xl font-black text-slate-100">Mis pronósticos</h1>
              <p className="text-sm text-slate-500 mt-1">
                {isGloballyLocked
                  ? 'Tus predicciones están finalizadas y bloqueadas.'
                  : 'Se guardan automáticamente · Cierre antes de cada partido'}
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

          {/* Lock banner or action buttons */}
          {isGloballyLocked ? (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
              <ShieldCheck className="h-5 w-5 text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-400">Pronósticos bloqueados</p>
                <p className="text-xs text-slate-500">
                  Finalizados el {new Date(user.groupStageLockedAt!).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setModal('lock')}
                disabled={savedCount === 0}
                className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/20"
              >
                <Lock className="h-4 w-4" />
                Finalizar predicciones
              </button>
              <button
                onClick={() => setModal('clear')}
                disabled={savedCount === 0}
                className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-400 hover:border-red-500/40 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Borrar todo
              </button>
            </div>
          )}
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
                      globalLocked={isGloballyLocked}
                      clearTrigger={clearTrigger}
                      onSaved={(id) => setSavedIds((s) => new Set(s).add(id))}
                    />
                  ))}
                </div>
              </section>
            ))}

            {/* Bottom action buttons — repeat for convenience after scrolling through all matches */}
            {!isGloballyLocked && (
              <div className="border-t border-slate-800/60 pt-6 flex flex-wrap gap-2">
                <button
                  onClick={() => setModal('lock')}
                  disabled={savedCount === 0}
                  className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/20"
                >
                  <Lock className="h-4 w-4" />
                  Finalizar predicciones
                </button>
                <button
                  onClick={() => setModal('clear')}
                  disabled={savedCount === 0}
                  className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-400 hover:border-red-500/40 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Borrar todo
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

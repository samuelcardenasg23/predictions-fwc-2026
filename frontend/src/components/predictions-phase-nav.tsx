'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { MatchStage, KnockoutStageStatus } from '@/lib/types';

const KNOCKOUT_STAGES: MatchStage[] = ['R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL'];

const STAGE_LABELS: Record<MatchStage, string> = {
  GROUP: 'Grupos',
  R32: 'Fase 32',
  R16: 'Octavos',
  QF: 'Cuartos',
  SF: 'Semis',
  THIRD_PLACE: '3er Lugar',
  FINAL: 'Final',
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

export function PredictionsPhaseNav({ current }: { current: 'GROUP' | MatchStage }) {
  const router = useRouter();
  const { token } = useAuth();

  const { data: statuses } = useQuery<Record<MatchStage, KnockoutStageStatus>>({
    queryKey: ['stages-status'],
    queryFn: () => api.get('/matches/stages/status').then((r) => r.data),
    staleTime: 30_000,
    enabled: !!token,
  });

  const anyKnockoutActive = statuses
    ? KNOCKOUT_STAGES.some((s) => statuses[s] !== 'inactive')
    : false;

  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-900/40 p-1">
      {/* Grupos tab */}
      <button
        className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
          current === 'GROUP'
            ? 'bg-amber-500 text-black'
            : 'cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }`}
        onClick={() => current !== 'GROUP' && router.push('/predictions')}
      >
        {STAGE_LABELS['GROUP']}
      </button>

      {/* Knockout stage tabs */}
      {KNOCKOUT_STAGES.map((stage) => {
        const status = statuses?.[stage] ?? 'inactive';
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

        const indicator = status === 'open' ? ' 🟢' : status === 'locked' ? ' 🔒' : '';

        return (
          <button
            key={stage}
            className={tabCls}
            disabled={isInactive}
            onClick={() =>
              !isInactive && router.push(`/predictions/knockout/${STAGE_TO_SLUG[stage]}`)
            }
          >
            {STAGE_LABELS[stage]}
            {indicator}
          </button>
        );
      })}

      {/* Hint when no knockout stage is active yet */}
      {!anyKnockoutActive && current === 'GROUP' && (
        <span className="flex-shrink-0 self-center px-2 text-xs text-slate-700 select-none">
          · Eliminatoria disponible cuando el admin active cada fase
        </span>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Lock, Loader2, Check, AlertCircle, X, Target } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Match, Prediction } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';
import { Flag } from '@/components/flag';
import { cn } from '@/lib/utils';

interface Props {
  match: Match;
  prediction?: Prediction;
  globalLocked?: boolean;
  onSaved?: (matchId: string) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type ScoreResult = 'exact' | 'outcome' | 'miss' | null;

function getScoreResult(
  pred: { homeScore: number; awayScore: number },
  match: { homeScore: number | null; awayScore: number | null },
): ScoreResult {
  if (match.homeScore === null || match.awayScore === null) return null;
  if (pred.homeScore === match.homeScore && pred.awayScore === match.awayScore) return 'exact';
  const outcome = (h: number, a: number) => (h > a ? 'H' : h < a ? 'A' : 'D');
  return outcome(pred.homeScore, pred.awayScore) === outcome(match.homeScore, match.awayScore)
    ? 'outcome'
    : 'miss';
}

function getTeamBonusMessage(
  pred: Prediction | undefined,
  match: Match,
): { homePick: boolean | null; awayPick: boolean | null; scoreResult: ScoreResult } {
  if (!pred || match.status !== 'FINISHED' || match.homeScore === null) {
    return { homePick: null, awayPick: null, scoreResult: null };
  }
  const homePick = pred.homeTeamPick ? pred.homeTeamPick === match.homeTeam : null;
  const awayPick = pred.awayTeamPick ? pred.awayTeamPick === match.awayTeam : null;
  const scoreResult = getScoreResult(pred, match);
  return { homePick, awayPick, scoreResult };
}

function buildFeedbackMessage(
  homePick: boolean | null,
  awayPick: boolean | null,
  scoreResult: ScoreResult,
): string {
  const teamsCorrect = homePick === true && awayPick === true;
  const oneTeamCorrect = (homePick === true) !== (awayPick === true);
  const noTeams = homePick === false && awayPick === false;
  const noTeamPicks = homePick === null && awayPick === null;

  if (noTeamPicks) {
    if (scoreResult === 'exact') return 'Sin picks de equipos · Marcador exacto';
    if (scoreResult === 'outcome') return 'Sin picks de equipos · Resultado correcto';
    return 'Sin puntos';
  }
  if (teamsCorrect && scoreResult === 'exact') return '¡Acertaste equipos y marcador exacto!';
  if (teamsCorrect && scoreResult === 'outcome') return 'Acertaste ambos equipos y el resultado';
  if (teamsCorrect && scoreResult === 'miss') return 'Acertaste equipos, pero no el marcador';
  if (oneTeamCorrect && scoreResult === 'exact') return 'Acertaste un equipo y el marcador exacto';
  if (oneTeamCorrect && scoreResult === 'outcome') return 'Acertaste un equipo y el resultado';
  if (noTeams && scoreResult === 'exact') return 'No acertaste equipos, pero sí el marcador exacto';
  if (noTeams && scoreResult === 'outcome') return 'No acertaste equipos, pero sí el resultado';
  return 'Sin puntos';
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('es-CO', { month: 'short', day: 'numeric', timeZone: 'America/Bogota' }),
    time: d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' }),
  };
}

function ScoreInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <input
      type="number"
      min={0}
      max={20}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="h-9 w-11 rounded-lg border border-slate-700/80 bg-slate-800/80 text-center font-mono text-sm font-bold text-slate-100 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
      placeholder="—"
    />
  );
}

function TeamButton({
  team,
  selected,
  onClick,
  disabled,
  correct,
}: {
  team: string;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
  correct?: boolean | null;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all',
        disabled && 'cursor-not-allowed opacity-60',
        !disabled && 'cursor-pointer',
        selected && correct === null
          ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
          : selected && correct === true
            ? 'border-green-500/60 bg-green-500/15 text-green-300'
            : selected && correct === false
              ? 'border-red-500/40 bg-red-500/10 text-red-300'
              : 'border-slate-700/60 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:text-slate-200',
      )}
    >
      <Flag country={team} size={20} />
      <span className="truncate max-w-[80px]">{team}</span>
      {selected && correct === true && <Check className="h-3 w-3 text-green-400 shrink-0" />}
      {selected && correct === false && <X className="h-3 w-3 text-red-400 shrink-0" />}
    </button>
  );
}

export function KnockoutMatchCard({ match, prediction, globalLocked = false, onSaved }: Props) {
  const homeOpts = match.homeTeamOpts?.split(',').map((s) => s.trim()) ?? [];
  const awayOpts = match.awayTeamOpts?.split(',').map((s) => s.trim()) ?? [];

  const [homePick, setHomePick] = useState<string>(prediction?.homeTeamPick ?? '');
  const [awayPick, setAwayPick] = useState<string>(prediction?.awayTeamPick ?? '');
  const [home, setHome] = useState(prediction?.homeScore?.toString() ?? '');
  const [away, setAway] = useState(prediction?.awayScore?.toString() ?? '');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    setHomePick(prediction?.homeTeamPick ?? '');
    setAwayPick(prediction?.awayTeamPick ?? '');
    setHome(prediction?.homeScore?.toString() ?? '');
    setAway(prediction?.awayScore?.toString() ?? '');
  }, [prediction?.homeTeamPick, prediction?.awayTeamPick, prediction?.homeScore, prediction?.awayScore]);

  const debouncedHome = useDebounce(home, 1000);
  const debouncedAway = useDebounce(away, 1000);

  const save = (homeVal: number, awayVal: number, hPick: string, aPick: string) => {
    setSaveStatus('saving');
    api
      .put(`/predictions/${match.id}`, {
        homeScore: homeVal,
        awayScore: awayVal,
        ...(hPick ? { homeTeamPick: hPick } : {}),
        ...(aPick ? { awayTeamPick: aPick } : {}),
      })
      .then(() => {
        setSaveStatus('saved');
        onSaved?.(match.id);
        setTimeout(() => setSaveStatus('idle'), 2000);
      })
      .catch(() => {
        setSaveStatus('error');
        toast.error(`Error guardando ${match.homeTeam} vs ${match.awayTeam}`);
        setTimeout(() => setSaveStatus('idle'), 3000);
      });
  };

  useEffect(() => {
    if (globalLocked) return;
    if (debouncedHome === '' || debouncedAway === '') return;
    const hVal = parseInt(debouncedHome);
    const aVal = parseInt(debouncedAway);
    if (isNaN(hVal) || isNaN(aVal)) return;
    if (hVal === prediction?.homeScore && aVal === prediction?.awayScore) return;
    save(hVal, aVal, homePick, awayPick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedHome, debouncedAway]);

  const handleTeamPick = (slot: 'home' | 'away', team: string) => {
    const newHomePick = slot === 'home' ? team : homePick;
    const newAwayPick = slot === 'away' ? team : awayPick;
    if (slot === 'home') setHomePick(team);
    else setAwayPick(team);
    const hVal = parseInt(home);
    const aVal = parseInt(away);
    if (!isNaN(hVal) && !isNaN(aVal)) {
      save(hVal, aVal, newHomePick, newAwayPick);
    }
  };

  const { date, time } = formatTime(match.scheduledAt);
  const isLive = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';
  const { homePick: homePickCorrect, awayPick: awayPickCorrect, scoreResult } = getTeamBonusMessage(prediction, match);
  const feedbackMsg = isFinished && prediction ? buildFeedbackMessage(homePickCorrect, awayPickCorrect, scoreResult) : null;

  const resolvedHomeTeam = match.homeTeam !== 'TBD' ? match.homeTeam : null;
  const resolvedAwayTeam = match.awayTeam !== 'TBD' ? match.awayTeam : null;

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3 transition-all',
        isLive
          ? 'border-red-500/30 bg-red-500/5 shadow-sm shadow-red-500/10'
          : isFinished
            ? scoreResult === 'exact'
              ? 'border-green-500/20 bg-green-500/5'
              : scoreResult === 'outcome'
                ? 'border-blue-500/20 bg-blue-500/5'
                : 'border-slate-800/60 bg-slate-900/40'
            : 'border-amber-500/15 bg-amber-500/5 hover:border-amber-500/25',
        globalLocked && !isLive && !isFinished && 'opacity-70',
      )}
    >
      {/* Live indicator */}
      {isLive && (
        <div className="inline-flex items-center gap-1.5 rounded-md bg-red-500 px-2 py-0.5 mb-2">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-white">En Vivo</span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <div className="w-14 shrink-0 text-center">
          <p className="text-[10px] font-medium text-slate-600 uppercase">{date}</p>
          <p className="text-xs font-bold text-slate-500">{time}</p>
        </div>

        {/* Team pickers or resolved teams */}
        <div className="flex flex-1 items-center gap-2 min-w-0">
          {/* Home slot */}
          <div className="flex flex-1 flex-col items-end gap-1 min-w-0">
            {isFinished || globalLocked ? (
              <div className="flex items-center gap-1.5">
                {resolvedHomeTeam && <Flag country={resolvedHomeTeam} size={28} />}
                <span className="text-sm font-semibold text-slate-200 truncate">
                  {resolvedHomeTeam ?? 'TBD'}
                </span>
                {isFinished && homePickCorrect === true && <Check className="h-3.5 w-3.5 text-green-400 shrink-0" />}
                {isFinished && homePickCorrect === false && <X className="h-3.5 w-3.5 text-red-400 shrink-0" />}
              </div>
            ) : homeOpts.length > 0 ? (
              <div className="flex gap-1 flex-wrap justify-end">
                {homeOpts.map((t) => (
                  <TeamButton
                    key={t}
                    team={t}
                    selected={homePick === t}
                    onClick={() => handleTeamPick('home', t)}
                    disabled={globalLocked}
                    correct={null}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {resolvedHomeTeam && <Flag country={resolvedHomeTeam} size={28} />}
                <span className="text-sm font-semibold text-slate-200 truncate">
                  {resolvedHomeTeam ?? 'TBD'}
                </span>
              </div>
            )}
          </div>

          {/* Score */}
          {!isLive && !isFinished ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <ScoreInput value={home} onChange={setHome} disabled={globalLocked} />
              <span className="text-slate-600 font-bold text-sm">–</span>
              <ScoreInput value={away} onChange={setAway} disabled={globalLocked} />
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-800/60 px-3 py-1.5">
                <span className={cn('font-mono text-base font-black', isLive ? 'text-red-400' : 'text-slate-100')}>
                  {match.homeScore ?? '–'}
                </span>
                <span className="text-slate-600">:</span>
                <span className={cn('font-mono text-base font-black', isLive ? 'text-red-400' : 'text-slate-100')}>
                  {match.awayScore ?? '–'}
                </span>
              </div>
              {prediction && (
                <div className="flex flex-col items-center">
                  <span className={cn(
                    'text-[9px] uppercase font-semibold',
                    scoreResult === 'exact' ? 'text-green-500' :
                    scoreResult === 'outcome' ? 'text-blue-400' :
                    scoreResult === 'miss' ? 'text-red-500' : 'text-slate-600',
                  )}>
                    {scoreResult === 'exact' ? 'exacta' : scoreResult === 'outcome' ? 'ganador' : scoreResult === 'miss' ? 'fallada' : ''}
                  </span>
                  <span className={cn(
                    'text-xs font-mono',
                    scoreResult === 'exact' ? 'text-green-400 font-bold' :
                    scoreResult === 'outcome' ? 'text-blue-400' : 'text-red-400',
                  )}>
                    {prediction.homeScore}:{prediction.awayScore}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Away slot */}
          <div className="flex flex-1 flex-col items-start gap-1 min-w-0">
            {isFinished || globalLocked ? (
              <div className="flex items-center gap-1.5">
                {isFinished && awayPickCorrect === true && <Check className="h-3.5 w-3.5 text-green-400 shrink-0" />}
                {isFinished && awayPickCorrect === false && <X className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                {resolvedAwayTeam && <Flag country={resolvedAwayTeam} size={28} />}
                <span className="text-sm font-semibold text-slate-200 truncate">
                  {resolvedAwayTeam ?? 'TBD'}
                </span>
              </div>
            ) : awayOpts.length > 0 ? (
              <div className="flex gap-1 flex-wrap">
                {awayOpts.map((t) => (
                  <TeamButton
                    key={t}
                    team={t}
                    selected={awayPick === t}
                    onClick={() => handleTeamPick('away', t)}
                    disabled={globalLocked}
                    correct={null}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {resolvedAwayTeam && <Flag country={resolvedAwayTeam} size={28} />}
                <span className="text-sm font-semibold text-slate-200 truncate">
                  {resolvedAwayTeam ?? 'TBD'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Status icon */}
        <div className="flex w-7 shrink-0 items-center justify-center">
          {!globalLocked && saveStatus === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
          {!globalLocked && saveStatus === 'saved' && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/15">
              <Check className="h-3 w-3 text-green-400" />
            </div>
          )}
          {!globalLocked && saveStatus === 'error' && <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
          {globalLocked && !isFinished && !isLive && <Lock className="h-3 w-3 text-slate-700" />}
          {scoreResult === 'exact' && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20">
              <Check className="h-3 w-3 text-green-400" />
            </div>
          )}
          {scoreResult === 'outcome' && <Target className="h-3.5 w-3.5 text-blue-400" />}
          {scoreResult === 'miss' && <X className="h-3.5 w-3.5 text-red-400" />}
        </div>
      </div>

      {/* Feedback row (finished only) */}
      {feedbackMsg && (
        <div className={cn(
          'mt-1 rounded-lg px-3 py-1.5 text-xs',
          scoreResult === 'exact' ? 'bg-green-500/10 text-green-400' :
          scoreResult === 'outcome' ? 'bg-blue-500/10 text-blue-400' :
          'bg-slate-800/60 text-slate-500',
        )}>
          {feedbackMsg}
        </div>
      )}
    </div>
  );
}

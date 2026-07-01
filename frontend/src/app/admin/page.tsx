'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Match, MatchStage, MatchStatus, KnockoutStageStatus } from '@/lib/types';
import { Flag } from '@/components/flag';
import { TeamCombobox } from '@/components/team-combobox';
import { toast } from 'sonner';
import { Fragment } from 'react';
import { Plus, Pencil, Trash2, Zap, ShieldCheck, Lock, ChevronDown, ChevronUp, Check, X } from 'lucide-react';

// ─── constants ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<MatchStatus, string> = {
  SCHEDULED: 'Programado',
  LIVE: 'En vivo',
  FINISHED: 'Finalizado',
};

const STAGE_LABELS: Record<string, string> = {
  GROUP: 'Fase de grupos',
  R32: 'Fase de 32',
  R16: 'Octavos de final',
  QF: 'Cuartos de final',
  SF: 'Semifinales',
  THIRD_PLACE: 'Tercer lugar',
  FINAL: 'Final',
};

const KNOCKOUT_STAGES: MatchStage[] = ['R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL'];

// ─── results tab ─────────────────────────────────────────────────────────────

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
    if (home !== undefined && (isNaN(home) || home < 0)) { toast.error('Goles local inválidos'); return; }
    if (away !== undefined && (isNaN(away) || away < 0)) { toast.error('Goles visitante inválidos'); return; }

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
      <div className="flex items-center justify-end gap-2 min-w-0">
        <span className="truncate text-sm font-medium text-slate-100 text-right hidden sm:block">{match.homeTeam}</span>
        <Flag country={match.homeTeam} size={32} />
      </div>
      <div className="flex items-center gap-1.5">
        <input type="number" min={0} value={homeScore} onChange={(e) => setHomeScore(e.target.value)}
          className="w-12 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-center text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="–" />
        <span className="text-slate-500 text-xs">–</span>
        <input type="number" min={0} value={awayScore} onChange={(e) => setAwayScore(e.target.value)}
          className="w-12 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-center text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="–" />
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <Flag country={match.awayTeam} size={32} />
        <span className="truncate text-sm font-medium text-slate-100 hidden sm:block">{match.awayTeam}</span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <select value={status} onChange={(e) => setStatus(e.target.value as MatchStatus)}
          className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          style={{ color: status === 'LIVE' ? '#4ade80' : status === 'FINISHED' ? '#60a5fa' : '#94a3b8' }}>
          {(['SCHEDULED', 'LIVE', 'FINISHED'] as MatchStatus[]).map((s) => (
            <option key={s} value={s} className="text-white bg-slate-800">{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <span className="text-xs text-slate-500">{scheduledDate}</span>
      </div>
      <button onClick={save} disabled={saving}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  );
}

function ResultsTab({ matches, loading, onInvalidate }: { matches: Match[] | undefined; loading: boolean; onInvalidate: () => void }) {
  const grouped = (matches ?? []).reduce<Record<string, Match[]>>((acc, m) => {
    if (!acc[m.stage]) acc[m.stage] = [];
    acc[m.stage].push(m);
    return acc;
  }, {});
  const stageOrder = ['GROUP', 'R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL'];
  const sortedStages = Object.keys(grouped).sort((a, b) => stageOrder.indexOf(a) - stageOrder.indexOf(b));

  const total = matches?.length ?? 0;
  const withScore = matches?.filter((m) => m.homeScore !== null).length ?? 0;
  const live = matches?.filter((m) => m.status === 'LIVE').length ?? 0;

  return (
    <>
      {!loading && (
        <div className="mb-4 flex gap-4 text-xs text-slate-500">
          <span>{total} partidos totales</span>
          <span className="text-blue-400">{withScore} con resultado</span>
          {live > 0 && <span className="text-green-400">{live} en vivo</span>}
        </div>
      )}
      {loading ? (
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
                  <MatchRow key={match.id} match={match} onSaved={onInvalidate} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

// ─── manage phases tab ────────────────────────────────────────────────────────

interface NewMatchForm {
  homeTeam: string;
  awayTeam: string;
  scheduledAt: string;
  matchOrder: string;
}

const EMPTY_FORM: NewMatchForm = { homeTeam: '', awayTeam: '', scheduledAt: '', matchOrder: '' };

function StageSection({
  stage,
  status,
  matches,
  onInvalidate,
}: {
  stage: MatchStage;
  status: KnockoutStageStatus;
  matches: Match[];
  onInvalidate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewMatchForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ homeTeam: string; awayTeam: string; scheduledAt: string }>({ homeTeam: '', awayTeam: '', scheduledAt: '' });
  const [editSaving, setEditSaving] = useState(false);

  async function addMatch() {
    if (!form.homeTeam || !form.awayTeam || !form.scheduledAt) {
      toast.error('Completa local, visitante y fecha');
      return;
    }
    if (form.homeTeam === form.awayTeam) {
      toast.error('Los equipos no pueden ser iguales');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/matches', {
        homeTeam: form.homeTeam,
        awayTeam: form.awayTeam,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        stage,
        phase: 'KNOCKOUT',
        matchOrder: form.matchOrder ? parseInt(form.matchOrder, 10) : undefined,
      });
      toast.success(`Partido creado: ${form.homeTeam} vs ${form.awayTeam}`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      onInvalidate();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al crear el partido');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(match: Match) {
    setEditingId(match.id);
    // Convert ISO date to datetime-local format (YYYY-MM-DDTHH:mm)
    const local = new Date(match.scheduledAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    const scheduledAtLocal = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
    setEditForm({
      homeTeam: match.homeTeam === 'TBD' ? '' : match.homeTeam,
      awayTeam: match.awayTeam === 'TBD' ? '' : match.awayTeam,
      scheduledAt: scheduledAtLocal,
    });
  }

  async function saveEdit(matchId: string) {
    if (!editForm.homeTeam || !editForm.awayTeam) {
      toast.error('Selecciona ambos equipos');
      return;
    }
    if (editForm.homeTeam === editForm.awayTeam) {
      toast.error('Los equipos no pueden ser iguales');
      return;
    }
    if (!editForm.scheduledAt) {
      toast.error('Selecciona la fecha y hora');
      return;
    }
    setEditSaving(true);
    try {
      await api.patch(`/admin/matches/${matchId}`, {
        ...editForm,
        scheduledAt: new Date(editForm.scheduledAt).toISOString(),
      });
      toast.success(`Actualizado: ${editForm.homeTeam} vs ${editForm.awayTeam}`);
      setEditingId(null);
      onInvalidate();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al actualizar');
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteMatch(id: string, home: string, away: string) {
    setDeletingId(id);
    try {
      await api.delete(`/admin/matches/${id}`);
      toast.success(`Partido eliminado: ${home} vs ${away}`);
      onInvalidate();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  }

  async function activateStage() {
    setActivating(true);
    try {
      await api.post(`/admin/stages/${stage}/activate`);
      toast.success(`${STAGE_LABELS[stage]} activada — email enviado a todos`);
      onInvalidate();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al activar la fase');
    } finally {
      setActivating(false);
    }
  }

  const statusColor = status === 'open' ? 'text-green-400 border-green-500/30 bg-green-500/5'
    : status === 'locked' ? 'text-slate-400 border-slate-700 bg-slate-800/40'
    : 'text-amber-400 border-amber-500/30 bg-amber-500/5';

  const statusLabel = status === 'open' ? 'Abierta' : status === 'locked' ? 'Cerrada' : 'Inactiva';

  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden">
      {/* Stage header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-200">{STAGE_LABELS[stage]}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}>
            {statusLabel}
          </span>
          <span className="text-xs text-slate-500">{matches.length} partido{matches.length !== 1 ? 's' : ''}</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>

      {expanded && (
        <div className="border-t border-slate-800 p-4 space-y-4">
          {/* Action bar */}
          <div className="flex flex-wrap gap-2">
            {status === 'inactive' && (
              <button
                onClick={activateStage}
                disabled={activating || matches.length === 0}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Zap className="h-3.5 w-3.5" />
                {activating ? 'Activando…' : 'Activar fase'}
              </button>
            )}
            {status === 'open' && (
              <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2 text-xs text-green-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Fase activa — usuarios pueden ingresar predicciones
              </div>
            )}
            {status === 'locked' && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2 text-xs text-slate-400">
                <Lock className="h-3.5 w-3.5" />
                Fase cerrada — predicciones bloqueadas
              </div>
            )}
            {status !== 'locked' && (
              <button
                onClick={() => setShowForm((f) => !f)}
                className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:border-amber-500/40 hover:text-amber-400 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                {showForm ? 'Cancelar' : 'Agregar partido'}
              </button>
            )}
          </div>

          {/* Add match form */}
          {showForm && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Nuevo partido</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Local</label>
                  <TeamCombobox
                    value={form.homeTeam}
                    onChange={(v) => setForm((f) => ({ ...f, homeTeam: v }))}
                    placeholder="Equipo local"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Visitante</label>
                  <TeamCombobox
                    value={form.awayTeam}
                    onChange={(v) => setForm((f) => ({ ...f, awayTeam: v }))}
                    placeholder="Equipo visitante"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Fecha y hora</label>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Orden (opcional)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.matchOrder}
                    onChange={(e) => setForm((f) => ({ ...f, matchOrder: e.target.value }))}
                    placeholder="Ej: 1"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={addMatch}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  {saving ? 'Creando…' : 'Crear partido'}
                </button>
              </div>
            </div>
          )}

          {/* Match list */}
          {matches.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-600">
              Sin partidos creados para esta fase
            </div>
          ) : (
            <div className="space-y-2">
              {matches
                .slice()
                .sort((a, b) => (a.matchOrder ?? 0) - (b.matchOrder ?? 0))
                .map((match) => {
                  const kickoffPassed = new Date(match.scheduledAt) <= new Date();
                  const dateStr = new Date(match.scheduledAt).toLocaleString('es-MX', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  });
                  const isTBD = match.homeTeam === 'TBD' || match.awayTeam === 'TBD';
                  const isEditing = editingId === match.id;
                  return (
                    <Fragment key={match.id}>
                      <div className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors ${isEditing ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800 bg-slate-900/40'}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          {match.matchOrder && (
                            <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded bg-slate-800 text-[10px] font-bold text-slate-400">
                              {match.matchOrder}
                            </span>
                          )}
                          <div className="flex items-center gap-2 min-w-0">
                            <Flag country={match.homeTeam} size={24} />
                            <span className={`text-sm font-medium truncate ${isTBD ? 'text-slate-500 italic' : 'text-slate-200'}`}>{match.homeTeam}</span>
                            <span className="text-xs text-slate-600">vs</span>
                            <span className={`text-sm font-medium truncate ${isTBD ? 'text-slate-500 italic' : 'text-slate-200'}`}>{match.awayTeam}</span>
                            <Flag country={match.awayTeam} size={24} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-slate-500 hidden sm:block">{dateStr}</span>
                          {match.status !== 'FINISHED' && (
                            <button
                              onClick={() => isEditing ? setEditingId(null) : startEdit(match)}
                              className={`rounded-lg border p-1.5 transition-colors ${isEditing ? 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10' : 'border-slate-700 text-slate-500 hover:border-amber-500/40 hover:text-amber-400'}`}
                              title={isEditing ? 'Cancelar edición' : 'Editar equipos'}
                            >
                              {isEditing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          {!kickoffPassed && status !== 'locked' && !isEditing && (
                            <button
                              onClick={() => deleteMatch(match.id, match.homeTeam, match.awayTeam)}
                              disabled={deletingId === match.id}
                              className="rounded-lg border border-slate-700 p-1.5 text-slate-500 hover:border-red-500/40 hover:text-red-400 disabled:opacity-50 transition-colors"
                              title="Eliminar partido"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      {isEditing && (
                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-3 -mt-1">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">Editar equipos — Partido {match.matchOrder ?? match.id.slice(0, 6)}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Local</label>
                              <TeamCombobox
                                value={editForm.homeTeam}
                                onChange={(v) => setEditForm((f) => ({ ...f, homeTeam: v }))}
                                placeholder="Equipo local"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Visitante</label>
                              <TeamCombobox
                                value={editForm.awayTeam}
                                onChange={(v) => setEditForm((f) => ({ ...f, awayTeam: v }))}
                                placeholder="Equipo visitante"
                              />
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Fecha y hora</label>
                              <input
                                type="datetime-local"
                                value={editForm.scheduledAt}
                                onChange={(e) => setEditForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => saveEdit(match.id)}
                              disabled={editSaving}
                              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-all"
                            >
                              <Check className="h-3.5 w-3.5" />
                              {editSaving ? 'Guardando…' : 'Guardar'}
                            </button>
                          </div>
                        </div>
                      )}
                    </Fragment>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatLeadWindow(minutes: number): string {
  if (minutes <= 0) return 'al inicio de cada partido';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} ${h === 1 ? 'hora' : 'horas'}`);
  if (m > 0) parts.push(`${m} ${m === 1 ? 'minuto' : 'minutos'}`);
  return `${parts.join(' y ')} antes de cada partido`;
}

function LeadTimeConfig() {
  const queryClient = useQueryClient();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const { data } = useQuery<{ minutes: number }>({
    queryKey: ['prediction-lead-time'],
    queryFn: () => api.get('/admin/config/prediction-lead-time').then((r) => r.data),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (data) setValue(String(data.minutes));
  }, [data]);

  const parsed = parseInt(value, 10);
  const valid = !isNaN(parsed) && parsed >= 0 && parsed <= 10080;
  const dirty = data !== undefined && String(data.minutes) !== value;

  async function save() {
    if (!valid) {
      toast.error('Ingresa un número de minutos válido (0–10080)');
      return;
    }
    setSaving(true);
    try {
      await api.put('/admin/config/prediction-lead-time', { minutes: parsed });
      toast.success('Tiempo de cierre actualizado');
      queryClient.invalidateQueries({ queryKey: ['prediction-lead-time'] });
      queryClient.invalidateQueries({ queryKey: ['stages-status'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['admin-matches'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-bold text-slate-200">Cierre de pronósticos</h3>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Cada partido de eliminatorias se cierra este tiempo antes de su propio inicio.
        Aplica a todas las fases knockout.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Minutos antes
          </label>
          <input
            type="number"
            min={0}
            max={10080}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-28 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
        <button
          onClick={save}
          disabled={saving || !valid || !dirty}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Check className="h-4 w-4" />
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        {valid && (
          <span className="text-xs text-slate-500 pb-2">
            Cierra {formatLeadWindow(parsed)}
          </span>
        )}
      </div>
    </div>
  );
}

function ManagePhasesTab({ matches, onInvalidate }: { matches: Match[] | undefined; onInvalidate: () => void }) {
  const { data: statuses } = useQuery<Record<MatchStage, KnockoutStageStatus>>({
    queryKey: ['stages-status'],
    queryFn: () => api.get('/matches/stages/status').then((r) => r.data),
    staleTime: 15_000,
  });

  const knockoutByStage = KNOCKOUT_STAGES.reduce<Record<MatchStage, Match[]>>((acc, stage) => {
    acc[stage] = (matches ?? []).filter((m) => m.stage === stage);
    return acc;
  }, {} as Record<MatchStage, Match[]>);

  return (
    <div className="space-y-3">
      <LeadTimeConfig />
      <p className="text-sm text-slate-400">
        Crea los partidos de cada fase eliminatoria una vez que los equipos estén definidos. Activa la fase para abrir predicciones.
      </p>
      {KNOCKOUT_STAGES.map((stage) => (
        <StageSection
          key={stage}
          stage={stage}
          status={statuses?.[stage] ?? 'inactive'}
          matches={knockoutByStage[stage]}
          onInvalidate={onInvalidate}
        />
      ))}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

type Tab = 'results' | 'phases';

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('results');

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) router.replace('/');
  }, [user, isLoading, router]);

  const { data: matches, isLoading: loadingMatches } = useQuery<Match[]>({
    queryKey: ['admin-matches'],
    queryFn: () => api.get('/matches').then((r) => r.data),
    enabled: !!user && user.role === 'ADMIN',
    staleTime: 0,
  });

  if (isLoading || !user || user.role !== 'ADMIN') return null;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin-matches'] });
    queryClient.invalidateQueries({ queryKey: ['stages-status'] });
    queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    queryClient.invalidateQueries({ queryKey: ['matches'] });
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Panel Admin</h1>
        <p className="mt-1 text-sm text-slate-400">
          Gestiona partidos y resultados del torneo.
        </p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 rounded-xl border border-slate-800/60 bg-slate-900/40 p-1 mb-6 w-fit">
        {([
          { id: 'results', label: 'Resultados' },
          { id: 'phases', label: 'Gestionar fases' },
        ] as { id: Tab; label: string }[]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === id
                ? 'bg-amber-500 text-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'results' ? (
        <ResultsTab matches={matches} loading={loadingMatches} onInvalidate={invalidate} />
      ) : (
        <ManagePhasesTab matches={matches} onInvalidate={invalidate} />
      )}
    </main>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { RefreshCw, Users } from 'lucide-react';

interface StandingEntry {
  position: number;
  team: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

interface StandingGroup {
  group: string;
  table: StandingEntry[];
}

function formatGroupName(group: string): string {
  return group.replace('GROUP_', 'Grupo ');
}

function TeamCrest({ src, name }: { src: string; name: string }) {
  return (
    <div className="h-5 w-5 shrink-0">
      <Image
        src={src}
        alt={name}
        width={20}
        height={20}
        className="h-full w-full object-contain"
        unoptimized
      />
    </div>
  );
}

function GroupCard({ group }: { group: StandingGroup }) {
  const name = formatGroupName(group.group);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/50">
      {/* Group header */}
      <div className="border-b border-slate-800/60 bg-slate-800/30 px-3 py-2.5">
        <span className="text-xs font-black uppercase tracking-widest text-green-400">{name}</span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[20px_1fr_20px_20px_20px_20px_28px] items-center gap-1 border-b border-slate-800/40 px-3 py-1.5">
        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600 text-center">#</div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Equipo</div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600 text-center">PJ</div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600 text-center">G</div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600 text-center">E</div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600 text-center">P</div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-green-500 text-center">Pts</div>
      </div>

      {/* Rows */}
      {group.table.map((entry) => {
        const qualifies = entry.position <= 2;
        const mayQualify = entry.position === 3;

        return (
          <div
            key={entry.team.id}
            className={`grid grid-cols-[20px_1fr_20px_20px_20px_20px_28px] items-center gap-1 border-b border-slate-800/30 px-3 py-2 last:border-0 ${
              qualifies
                ? 'bg-green-500/5'
                : mayQualify
                  ? 'bg-amber-500/5'
                  : ''
            }`}
          >
            {/* Position */}
            <div className="text-center">
              <span
                className={`text-[11px] font-bold ${
                  qualifies
                    ? 'text-green-400'
                    : mayQualify
                      ? 'text-amber-400'
                      : 'text-slate-600'
                }`}
              >
                {entry.position}
              </span>
            </div>

            {/* Team */}
            <div className="flex min-w-0 items-center gap-1.5">
              {entry.team.crest ? (
                <TeamCrest src={entry.team.crest} name={entry.team.name} />
              ) : (
                <div className="h-5 w-5 shrink-0 rounded bg-slate-800" />
              )}
              <span className="truncate text-[11px] font-semibold text-slate-200">
                {entry.team.tla || entry.team.shortName || entry.team.name}
              </span>
            </div>

            {/* Stats */}
            <div className="text-center text-[11px] text-slate-500">{entry.playedGames}</div>
            <div className="text-center text-[11px] text-slate-400">{entry.won}</div>
            <div className="text-center text-[11px] text-slate-400">{entry.draw}</div>
            <div className="text-center text-[11px] text-slate-400">{entry.lost}</div>

            {/* Points */}
            <div className="text-center">
              <span className={`text-[12px] font-black ${qualifies ? 'text-green-400' : 'text-slate-300'}`}>
                {entry.points}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/50">
      <div className="border-b border-slate-800/60 bg-slate-800/30 px-3 py-2.5">
        <div className="h-3 w-16 animate-pulse rounded bg-slate-700" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 border-b border-slate-800/30 px-3 py-2 last:border-0">
          <div className="h-3 w-3 animate-pulse rounded bg-slate-800" />
          <div className="h-5 w-5 animate-pulse rounded-full bg-slate-800" />
          <div className="h-3 flex-1 animate-pulse rounded bg-slate-800" />
          <div className="h-3 w-6 animate-pulse rounded bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

export default function StandingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const { data, isLoading, dataUpdatedAt } = useQuery<StandingGroup[]>({
    queryKey: ['standings-groups'],
    queryFn: () => api.get('/standings/groups').then((r) => r.data),
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });

  if (authLoading || !user) return null;

  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-green-500 mb-1">Fase de grupos</p>
        <h1 className="text-2xl font-black text-slate-100">Tabla de posiciones</h1>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          {updatedAt && (
            <p className="flex items-center gap-1.5 text-xs text-slate-600">
              <RefreshCw className="h-3 w-3" />
              Actualizado {updatedAt} · refresca cada 5 min
            </p>
          )}
          <div className="flex items-center gap-3 text-[10px] text-slate-600">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500/60" />
              Clasificado
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500/60" />
              Posible mejor 3°
            </span>
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : !data?.length ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
            <Users className="h-8 w-8 text-slate-600" />
          </div>
          <p className="font-medium text-slate-400">No hay datos de posiciones disponibles</p>
          <p className="max-w-xs text-sm text-slate-600">
            Las posiciones se actualizan cuando la fase de grupos está en curso.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((group) => (
            <GroupCard key={group.group} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

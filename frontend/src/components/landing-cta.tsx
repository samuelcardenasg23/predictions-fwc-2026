'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export function LandingCTA() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (user) {
    return (
      <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/predictions"
          className="rounded-xl bg-green-500 px-8 py-3 text-base font-bold text-slate-950 hover:bg-green-400 transition-all duration-200 shadow-lg shadow-green-500/25 hover:shadow-green-500/40"
        >
          Ver mis pronósticos
        </Link>
        <Link
          href="/leaderboard"
          className="rounded-xl border border-slate-700 bg-slate-900/60 px-8 py-3 text-base font-medium text-slate-300 hover:border-slate-600 hover:text-slate-100 transition-colors"
        >
          Tabla general
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
      <Link
        href="/register"
        className="rounded-xl bg-green-500 px-8 py-3 text-base font-bold text-slate-950 hover:bg-green-400 transition-all duration-200 shadow-lg shadow-green-500/25 hover:shadow-green-500/40"
      >
        Únete ahora — es gratis
      </Link>
      <Link
        href="/login"
        className="rounded-xl border border-slate-700 bg-slate-900/60 px-8 py-3 text-base font-medium text-slate-300 hover:border-slate-600 hover:text-slate-100 transition-colors"
      >
        Ya tengo cuenta
      </Link>
    </div>
  );
}

export function LandingBottomCTA() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (user) {
    return (
      <Link
        href="/predictions"
        className="inline-flex rounded-xl bg-green-500 px-8 py-3 text-base font-bold text-slate-950 hover:bg-green-400 transition-all shadow-lg shadow-green-500/20"
      >
        Ver mis pronósticos
      </Link>
    );
  }

  return (
    <Link
      href="/register"
      className="inline-flex rounded-xl bg-green-500 px-8 py-3 text-base font-bold text-slate-950 hover:bg-green-400 transition-all shadow-lg shadow-green-500/20"
    >
      Crear mi cuenta gratis
    </Link>
  );
}

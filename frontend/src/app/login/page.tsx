'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { AuthResponse } from '@/lib/types';
import { Trophy, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', {
        email: form.get('email'),
        password: form.get('password'),
      });
      login(data.access_token, data.user);
      router.push('/predictions');
    } catch {
      setError('Email o contraseña incorrectos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-96 w-96 rounded-full bg-green-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-8 backdrop-blur-sm shadow-2xl">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/10 border border-green-500/20">
              <Trophy className="h-6 w-6 text-green-400" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-slate-100">Bienvenido de vuelta</h1>
              <p className="text-sm text-slate-500 mt-0.5">Accede a tu quiniela del Mundial 2026</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-slate-700/80 bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                placeholder="tu@email.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-700/80 bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                placeholder="••••••••"
              />
            </div>

            {/* Inline error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3 text-sm font-bold text-slate-950 hover:bg-green-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="font-semibold text-green-400 hover:text-green-300 transition-colors">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

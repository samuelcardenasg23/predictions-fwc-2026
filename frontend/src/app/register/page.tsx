'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { AuthResponse } from '@/lib/types';
import { Trophy, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', {
        name: form.get('name'),
        email: form.get('email'),
        password: form.get('password'),
      });
      login(data.access_token, data.user);
      toast.success(`¡Bienvenido, ${data.user.name}! 🎉`);
      router.push('/predictions');
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Error al registrarse.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <Trophy className="h-6 w-6 text-amber-400" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-slate-100">Únete a la quiniela</h1>
              <p className="text-sm text-slate-500 mt-0.5">Mundial 2026 · 104 partidos · Gratis</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tu nombre
              </label>
              <input
                id="name"
                name="name"
                required
                autoComplete="name"
                className="w-full rounded-lg border border-slate-700/80 bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                placeholder="Como aparecerá en la tabla"
              />
            </div>
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
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-700/80 bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3 text-sm font-bold text-slate-950 hover:bg-green-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                'Crear mi cuenta gratis'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-semibold text-green-400 hover:text-green-300 transition-colors">
              Ingresar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

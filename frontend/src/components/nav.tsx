'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Trophy, LayoutGrid, BarChart3, LogOut, User, Grid3X3, ShieldCheck } from 'lucide-react';

export function Nav() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20 group-hover:bg-green-500/20 transition-colors">
            <Trophy className="h-4 w-4 text-green-400" />
          </div>
          <span className="font-bold text-sm tracking-tight">
            <span className="gradient-text">Quiniela</span>
            <span className="text-slate-400 ml-1 font-medium">FWC 2026</span>
          </span>
        </Link>

        {user ? (
          <nav className="flex items-center gap-1">
            {user.role !== 'ADMIN' && (
              <NavLink href="/predictions" active={isActive('/predictions')} icon={<LayoutGrid className="h-3.5 w-3.5" />}>
                Predicciones
              </NavLink>
            )}
            <NavLink href="/leaderboard" active={isActive('/leaderboard')} icon={<BarChart3 className="h-3.5 w-3.5" />}>
              Tabla
            </NavLink>
            <NavLink href="/standings" active={isActive('/standings')} icon={<Grid3X3 className="h-3.5 w-3.5" />}>
              Grupos
            </NavLink>
            {user.role === 'ADMIN' && (
              <NavLink href="/admin" active={isActive('/admin')} icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                Admin
              </NavLink>
            )}

            <div className="ml-2 flex items-center gap-2 border-l border-slate-800 pl-3">
              <div className="flex items-center gap-1.5 text-sm text-slate-400">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20">
                  <User className="h-3.5 w-3.5 text-green-400" />
                </div>
                <span className="hidden sm:block font-medium text-slate-300 max-w-[120px] truncate">
                  {user.name}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:block">Salir</span>
              </button>
            </div>
          </nav>
        ) : (
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
            >
              Ingresar
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-green-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-green-400 transition-colors"
            >
              Registrarse
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-green-500/10 text-green-400'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
      }`}
    >
      {icon}
      <span className="hidden sm:block">{children}</span>
    </Link>
  );
}

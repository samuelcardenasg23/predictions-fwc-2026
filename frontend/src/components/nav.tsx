'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';

export function Nav() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors hover:text-foreground ${
        pathname.startsWith(href) ? 'text-foreground' : 'text-muted-foreground'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Quiniela FWC 2026
        </Link>

        {user ? (
          <nav className="flex items-center gap-6">
            {navLink('/predictions', 'Predicciones')}
            {navLink('/leaderboard', 'Tabla')}
            <span className="text-sm text-muted-foreground">{user.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Salir
            </Button>
          </nav>
        ) : (
          <nav className="flex items-center gap-3">
            <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Ingresar
            </Link>
            <Link href="/register" className={cn(buttonVariants({ size: 'sm' }))}>
              Registrarse
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

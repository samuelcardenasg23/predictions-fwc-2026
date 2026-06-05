import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Trophy, Zap, Users, BarChart3 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center gap-6 px-4 py-24 text-center">
        <div className="flex items-center gap-3">
          <Trophy className="h-10 w-10 text-yellow-500" />
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-800">
            Mundial 2026 · Jun 11 – Jul 19
          </span>
        </div>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          La quiniela del Mundial 2026 más emocionante
        </h1>
        <p className="max-w-lg text-lg text-muted-foreground">
          Predice los resultados de los 104 partidos, compite con tus amigos y
          sigue la tabla en tiempo real mientras el torneo avanza.
        </p>
        <div className="flex gap-3">
          <Link href="/register" className={cn(buttonVariants({ size: 'lg' }))}>
            Únete ahora
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-muted/40 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-bold">¿Cómo funciona?</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">1. Regístrate</h3>
              <p className="text-sm text-muted-foreground">
                Crea tu cuenta con email y contraseña. Gratis para todos los participantes.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">2. Pronostica</h3>
              <p className="text-sm text-muted-foreground">
                Predice el marcador exacto de cada partido antes de que empiece. Ganas
                3 pts por resultado exacto y 1 pt por acertar el ganador.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">3. Compite</h3>
              <p className="text-sm text-muted-foreground">
                Sigue la tabla en vivo. Los puntos se calculan automáticamente
                conforme van llegando los resultados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Points table */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-6 text-center text-2xl font-bold">Tabla de puntos</h2>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Ronda</th>
                  <th className="px-4 py-3 text-center font-semibold">Exacto</th>
                  <th className="px-4 py-3 text-center font-semibold">Ganador</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  ['Fase de grupos', '3', '1'],
                  ['R32', '3', '1'],
                  ['Octavos (R16)', '6', '2'],
                  ['Cuartos (QF)', '9', '3'],
                  ['Semis (SF)', '12', '4'],
                  ['Final', '15', '5'],
                ].map(([round, exact, outcome]) => (
                  <tr key={round} className="hover:bg-muted/50">
                    <td className="px-4 py-3">{round}</td>
                    <td className="px-4 py-3 text-center font-mono font-semibold text-green-600">
                      +{exact}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-blue-600">
                      +{outcome}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

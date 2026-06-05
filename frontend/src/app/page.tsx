import { Trophy, Zap, Users, BarChart3, Star, Clock, Shield } from 'lucide-react';
import { LandingCTA, LandingBottomCTA } from '@/components/landing-cta';

const POINTS_ROWS = [
  { round: 'Fase de grupos', exact: 3, outcome: 1 },
  { round: 'Round of 32', exact: 3, outcome: 1 },
  { round: 'Octavos de final', exact: 6, outcome: 2 },
  { round: 'Cuartos de final', exact: 9, outcome: 3 },
  { round: 'Semifinales', exact: 12, outcome: 4 },
  { round: 'Gran Final', exact: 15, outcome: 5 },
];

const STEPS = [
  {
    icon: <Users className="h-5 w-5" />,
    step: '01',
    title: 'Regístrate gratis',
    desc: 'Crea tu cuenta en segundos. Sin tarjeta, sin complicaciones.',
  },
  {
    icon: <Zap className="h-5 w-5" />,
    step: '02',
    title: 'Pronostica los 104 partidos',
    desc: 'Fase de grupos y eliminatoria directa. Tus picks se guardan automáticamente.',
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    step: '03',
    title: 'Compite en tiempo real',
    desc: 'Los puntos se calculan solos conforme llegan los goles. Tabla actualizada al instante.',
  },
];

const FEATURES = [
  { icon: <Star className="h-4 w-4 text-amber-400" />, text: '104 partidos — grupos + knockout' },
  { icon: <Clock className="h-4 w-4 text-green-400" />, text: 'Resultados en vivo automáticos' },
  { icon: <Shield className="h-4 w-4 text-blue-400" />, text: 'Puntos con multiplicador por ronda' },
  { icon: <Trophy className="h-4 w-4 text-amber-400" />, text: 'Tabla global actualizada cada 30s' },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-4 py-28 text-center overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-green-500/5 blur-3xl" />
          <div className="absolute top-40 left-1/4 h-[300px] w-[300px] rounded-full bg-amber-500/5 blur-3xl" />
        </div>

        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/5 px-4 py-1.5 text-sm font-medium text-green-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          ⚽ FIFA World Cup 2026 · 11 Jun – 19 Jul
        </div>

        {/* Headline */}
        <h1 className="max-w-3xl text-5xl font-black tracking-tight sm:text-7xl leading-none">
          <span className="gradient-text">La quiniela</span>
          <br />
          <span className="text-slate-100">del Mundial</span>
          <br />
          <span className="gradient-text-gold">2026</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg text-slate-400 leading-relaxed">
          Predice los resultados de los <strong className="text-slate-200">104 partidos</strong>,
          compite con tus amigos y sigue la tabla en tiempo real mientras el torneo avanza.
        </p>

        {/* Features chips */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {FEATURES.map((f) => (
            <div
              key={f.text}
              className="flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-400"
            >
              {f.icon}
              {f.text}
            </div>
          ))}
        </div>

        {/* CTAs — client component para detectar si ya está logueado */}
        <LandingCTA />
      </section>

      {/* How it works */}
      <section className="border-t border-slate-800/60 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-green-500 mb-2">Cómo funciona</p>
            <h2 className="text-3xl font-bold text-slate-100">Simple. Rápido. Emocionante.</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.step}
                className="relative rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 hover:border-green-500/20 transition-colors"
              >
                <span className="absolute top-4 right-4 text-4xl font-black text-slate-800 select-none">
                  {s.step}
                </span>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 border border-green-500/20 text-green-400">
                  {s.icon}
                </div>
                <h3 className="mb-2 font-bold text-slate-100">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Points table */}
      <section className="border-t border-slate-800/60 px-4 py-20">
        <div className="mx-auto max-w-2xl">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-2">Sistema de puntos</p>
            <h2 className="text-3xl font-bold text-slate-100">Más puntos en las rondas finales</h2>
            <p className="mt-2 text-sm text-slate-500">Los puntos aumentan conforme avanza el torneo</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Ronda
                  </th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-green-500">
                    Exacto
                  </th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-blue-400">
                    Ganador
                  </th>
                </tr>
              </thead>
              <tbody>
                {POINTS_ROWS.map((row, i) => (
                  <tr
                    key={row.round}
                    className={`border-b border-slate-800/50 transition-colors hover:bg-slate-800/30 ${
                      i === POINTS_ROWS.length - 1 ? 'border-b-0 bg-amber-500/5' : ''
                    }`}
                  >
                    <td className="px-5 py-3.5 font-medium text-slate-300">
                      {i === POINTS_ROWS.length - 1 ? (
                        <span className="flex items-center gap-2">
                          <Trophy className="h-3.5 w-3.5 text-amber-400" />
                          {row.round}
                        </span>
                      ) : (
                        row.round
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono font-bold text-green-400">
                      +{row.exact} pts
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono font-medium text-blue-400">
                      +{row.outcome} pt
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="border-t border-slate-800/60 px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="rounded-2xl border border-green-500/15 bg-green-500/5 p-10">
            <Trophy className="mx-auto mb-4 h-10 w-10 text-amber-400" />
            <h2 className="text-2xl font-bold text-slate-100 mb-2">
              ¿Listo para pronosticar?
            </h2>
            <p className="text-slate-500 mb-6 text-sm">
              El torneo arranca el 11 de junio. No esperes más.
            </p>
            <LandingBottomCTA />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-600">
        Quiniela FWC 2026 · Datos vía API-Football
      </footer>
    </div>
  );
}

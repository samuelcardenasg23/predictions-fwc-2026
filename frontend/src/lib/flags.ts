// ISO 3166-1 alpha-2 codes para los 48 países del Mundial 2026
// URL: https://flagfeed.com/country/{iso2}
const ISO2: Record<string, string> = {
  // Grupo A
  'México': 'mx',
  'Sudáfrica': 'za',
  'Corea del Sur': 'kr',
  'Chequia': 'cz',

  // Grupo B
  'Canadá': 'ca',
  'Bosnia y Herzegovina': 'ba',
  'Qatar': 'qa',
  'Suiza': 'ch',

  // Grupo C
  'Brasil': 'br',
  'Marruecos': 'ma',
  'Haití': 'ht',
  'Escocia': 'gb',

  // Grupo D
  'Estados Unidos': 'us',
  'Paraguay': 'py',
  'Australia': 'au',
  'Turquía': 'tr',

  // Grupo E
  'Alemania': 'de',
  'Curazao': 'cw',
  'Costa de Marfil': 'ci',
  'Ecuador': 'ec',

  // Grupo F
  'Países Bajos': 'nl',
  'Japón': 'jp',
  'Túnez': 'tn',
  'Suecia': 'se',

  // Grupo G
  'Bélgica': 'be',
  'Egipto': 'eg',
  'Irán': 'ir',
  'Nueva Zelanda': 'nz',

  // Grupo H
  'España': 'es',
  'Cabo Verde': 'cv',
  'Arabia Saudita': 'sa',
  'Uruguay': 'uy',

  // Grupo I
  'Francia': 'fr',
  'Senegal': 'sn',
  'Irak': 'iq',
  'Noruega': 'no',

  // Grupo J
  'Argentina': 'ar',
  'Argelia': 'dz',
  'Austria': 'at',
  'Jordania': 'jo',

  // Grupo K
  'Portugal': 'pt',
  'Colombia': 'co',
  'Ghana': 'gh',
  'Uzbekistán': 'uz',

  // Grupo L
  'Inglaterra': 'gb',
  'Panamá': 'pa',
  'Congo RD': 'cd',
  'Croacia': 'hr',
};

export function getFlagUrl(country: string): string | null {
  const code = ISO2[country];
  if (!code) return null;
  return `https://flagfeed.com/country/${code}`;
}

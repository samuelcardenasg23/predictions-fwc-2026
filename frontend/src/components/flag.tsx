import Image from 'next/image';
import { getFlagUrl } from '@/lib/flags';

interface FlagProps {
  country: string;
  size?: number;
  className?: string;
}

export function Flag({ country, size = 40, className = '' }: FlagProps) {
  const src = getFlagUrl(country);

  if (!src) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center rounded bg-slate-800 text-[10px] text-slate-600 ${className}`}
        style={{ width: size, height: Math.round(size * 0.67) }}
      >
        {country === 'TBD' ? '?' : '?'}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={`Bandera de ${country}`}
      width={size}
      height={Math.round(size * 0.67)}
      className={`shrink-0 rounded object-cover shadow-sm ${className}`}
      unoptimized
    />
  );
}

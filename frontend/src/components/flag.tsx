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
    <div
      className={`shrink-0 overflow-hidden rounded-full shadow-sm ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={`Bandera de ${country}`}
        width={size}
        height={size}
        className="h-full w-full object-cover"
        unoptimized
      />
    </div>
  );
}

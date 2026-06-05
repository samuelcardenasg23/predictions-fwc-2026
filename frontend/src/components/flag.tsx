import Image from 'next/image';
import { getFlagUrl } from '@/lib/flags';

interface FlagProps {
  country: string;
  size?: number;
  className?: string;
}

export function Flag({ country, size = 28, className = '' }: FlagProps) {
  const src = getFlagUrl(country, 40);

  if (!src) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-sm bg-slate-700 text-[10px] text-slate-500 ${className}`}
        style={{ width: size, height: size * 0.67 }}
      >
        ?
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={country}
      width={size}
      height={Math.round(size * 0.67)}
      className={`rounded-sm object-cover shadow-sm ${className}`}
      unoptimized
    />
  );
}

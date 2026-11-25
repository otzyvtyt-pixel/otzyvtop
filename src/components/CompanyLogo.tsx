import { useState } from 'react';

interface CompanyLogoProps {
  name: string;
  logoUrl: string;
  size?: 'sm' | 'md' | 'lg';
}

const GRADIENT_BG = [
  'bg-gradient-to-br from-emerald-500 to-teal-700 text-white',
  'bg-gradient-to-br from-teal-500 to-cyan-700 text-white',
  'bg-gradient-to-br from-sky-500 to-indigo-700 text-white',
  'bg-gradient-to-br from-amber-500 to-orange-600 text-white',
  'bg-gradient-to-br from-violet-500 to-purple-700 text-white',
  'bg-gradient-to-br from-rose-500 to-pink-700 text-white',
];

function getInitials(name: string): string {
  const cleaned = name.replace(/[«»"'()]/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'OT';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return GRADIENT_BG[Math.abs(hash) % GRADIENT_BG.length];
}

export function CompanyLogo({ name, logoUrl, size = 'md' }: CompanyLogoProps) {
  const [failed, setFailed] = useState(false);

  const dims =
    size === 'lg'
      ? 'w-16 h-16 text-lg rounded-2xl'
      : size === 'sm'
        ? 'w-9 h-9 text-xs rounded-lg'
        : 'w-12 h-12 text-sm rounded-xl';

  if (!logoUrl || failed) {
    return (
      <div
        className={`${dims} ${hashColor(name)} shrink-0 flex items-center justify-center font-display font-bold tracking-tight shadow-xs select-none`}
        aria-hidden="true"
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div
      className={`${dims} shrink-0 bg-white border border-emerald-100 shadow-xs flex items-center justify-center overflow-hidden p-1.5`}
    >
      <img
        src={logoUrl}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-contain"
        loading="lazy"
      />
    </div>
  );
}

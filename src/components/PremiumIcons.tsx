import {
  ChatCenteredText,
  MagnifyingGlass,
  ShieldCheck,
} from '@phosphor-icons/react';

interface IconProps {
  className?: string;
}

export function OtzyvTopMark({ className = 'w-7 h-7' }: IconProps) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="otzyvBrandGrad"
          x1="2"
          y1="2"
          x2="26"
          y2="26"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#064E3B" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="24" height="24" rx="7" fill="url(#otzyvBrandGrad)" />
      <rect
        x="2.6"
        y="2.6"
        width="22.8"
        height="22.8"
        rx="6.4"
        stroke="white"
        strokeOpacity="0.18"
        strokeWidth="1.2"
      />
      <path
        d="M14 7.5 19.5 9.8v4.3c0 3.55-2.35 6.55-5.5 7.45-3.15-.9-5.5-3.9-5.5-7.45V9.8L14 7.5Z"
        fill="white"
        fillOpacity="0.14"
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="m11.6 14.1 1.7 1.75 3.35-3.5"
        stroke="white"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VerifiedShieldIcon({ className = 'w-4 h-4' }: IconProps) {
  return <ShieldCheck weight="duotone" className={className} aria-hidden="true" />;
}

export function SearchPrecisionIcon({ className = 'w-5 h-5' }: IconProps) {
  return <MagnifyingGlass weight="regular" className={className} aria-hidden="true" />;
}

export function StepVerifyIcon({ className = 'w-5 h-5' }: IconProps) {
  return <ShieldCheck weight="duotone" className={className} aria-hidden="true" />;
}

export function StepReviewIcon({ className = 'w-5 h-5' }: IconProps) {
  return <ChatCenteredText weight="duotone" className={className} aria-hidden="true" />;
}

export function RankBadge({ rank }: { rank: 1 | 2 | 3 }) {
  const tone =
    rank === 1
      ? 'text-amber-700 bg-amber-50 border-amber-200/80'
      : rank === 2
        ? 'text-slate-600 bg-slate-100 border-slate-200'
        : 'text-orange-800 bg-orange-50 border-orange-200/80';

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-md border font-mono text-[10px] font-semibold tabular-nums shrink-0 ${tone}`}
    >
      #0{rank}
    </span>
  );
}

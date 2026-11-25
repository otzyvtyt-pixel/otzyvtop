import {
  Bank,
  Buildings,
  CarProfile,
  Compass,
  ForkKnife,
  GraduationCap,
  Leaf,
  ShieldWarning,
  Storefront,
  TerminalWindow,
  Truck,
  type IconWeight,
} from '@phosphor-icons/react';
import type { CategoryId } from '../types.ts';

interface CategoryIconProps {
  category: CategoryId;
  className?: string;
  weight?: IconWeight;
}

export const CATEGORY_TILE_BASE =
  'bg-emerald-950/[0.035] border-emerald-900/12 text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]';

export const CATEGORY_TILE_INTERACTIVE =
  'bg-emerald-950/[0.035] border-emerald-900/12 text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] group-hover:bg-emerald-700 group-hover:text-white group-hover:border-emerald-700 transition-colors duration-200';

export const SCAMMER_TILE_BASE =
  'bg-rose-950/[0.045] border-rose-900/15 text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]';

export const SCAMMER_TILE_INTERACTIVE =
  'bg-rose-950/[0.045] border-rose-900/15 text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] group-hover:bg-rose-700 group-hover:text-white group-hover:border-rose-700 transition-colors duration-200';

export function CategoryIcon({
  category,
  className = 'w-5 h-5',
  weight = 'duotone',
}: CategoryIconProps) {
  const props = { className, weight, 'aria-hidden': true as const };
  switch (category) {
    case 'shops':
      return <Storefront {...props} />;
    case 'finance':
      return <Bank {...props} />;
    case 'delivery':
      return <Truck {...props} />;
    case 'food':
      return <ForkKnife {...props} />;
    case 'beauty':
      return <Leaf {...props} />;
    case 'auto':
      return <CarProfile {...props} />;
    case 'realestate':
      return <Buildings {...props} />;
    case 'education':
      return <GraduationCap {...props} />;
    case 'it':
      return <TerminalWindow {...props} />;
    case 'travel':
      return <Compass {...props} />;
    case 'scammers':
      return <ShieldWarning {...props} />;
  }
}

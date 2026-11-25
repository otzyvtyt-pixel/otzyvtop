import { useState } from 'react';
import { Star } from '@phosphor-icons/react';

interface StarRatingProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  labels?: readonly string[];
  onChange?: (value: number) => void;
}

export function StarRating({
  rating,
  size = 'sm',
  interactive = false,
  labels,
  onChange,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const iconClass =
    size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';

  const activeValue = interactive && hovered !== null ? hovered : rating;
  const activeLabel =
    interactive && labels && activeValue >= 1 && activeValue <= 5
      ? labels[activeValue - 1]
      : null;

  return (
    <div className="inline-flex items-center gap-2.5">
      <div
        className="inline-flex items-center gap-0.5"
        role={interactive ? 'radiogroup' : undefined}
        onMouseLeave={() => interactive && setHovered(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(activeValue);
          if (interactive) {
            const isSelected = star <= activeValue;
            return (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHovered(star)}
                onClick={() => onChange?.(star)}
                className="p-1.5 rounded-lg hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-emerald-600 transition-transform hover:scale-110 cursor-pointer"
                aria-label={`${star} / 5`}
                aria-checked={star === rating}
                role="radio"
              >
                <Star
                  weight={isSelected ? 'fill' : 'duotone'}
                  className={`${iconClass} ${
                    isSelected ? 'text-amber-500' : 'text-slate-300'
                  }`}
                  aria-hidden="true"
                />
              </button>
            );
          }
          return (
            <Star
              key={star}
              weight={filled ? 'fill' : 'duotone'}
              className={`${iconClass} ${
                filled ? 'text-amber-500' : 'text-slate-200'
              }`}
              aria-hidden="true"
            />
          );
        })}
      </div>
      {activeLabel && (
        <span className="text-xs font-semibold text-slate-600 tabular-nums">
          {activeValue}/5 · {activeLabel}
        </span>
      )}
    </div>
  );
}

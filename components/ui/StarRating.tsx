'use client'

import { Star, StarHalf } from 'lucide-react'

// Renders a 0-10 score as 5 stars (each star = 2 points) — storage/scoring
// logic stays 0-10 everywhere else, this is a display/input treatment only.
// Interactive mode snaps clicks to whole stars (0,2,4,6,8,10); existing odd
// scores (e.g. a 7 from before this change) still render correctly as a half-star.
export default function StarRating({
  score, onChange, readonly = false, size = 16,
}: { score: number; onChange?: (score: number) => void; readonly?: boolean; size?: number }) {
  const starValue = score / 2
  const stars = [1, 2, 3, 4, 5]

  return (
    <div className="flex items-center gap-0.5">
      {stars.map((i) => {
        const filled = starValue >= i
        const half = !filled && starValue >= i - 0.5
        return (
          <button
            key={i}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(i * 2)}
            className={readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}
            title={readonly ? undefined : `${i * 2}/10`}>
            {filled ? (
              <Star size={size} className="text-gold fill-gold" />
            ) : half ? (
              <StarHalf size={size} className="text-gold fill-gold" />
            ) : (
              <Star size={size} className="text-gray-300" />
            )}
          </button>
        )
      })}
    </div>
  )
}

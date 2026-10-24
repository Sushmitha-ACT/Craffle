import React from 'react';
import { Sparkles } from 'lucide-react';

interface VisualSimilarityBadgeProps {
  score?: number; // 0 to 1
  percentage?: number; // 0 to 100
  tier?: 'Strong Visual Match' | 'High Similarity' | 'Good Match' | 'Moderate Match' | string;
  size?: 'sm' | 'md' | 'lg';
}

export default function VisualSimilarityBadge({
  percentage = 0,
  tier,
  size = 'md'
}: VisualSimilarityBadgeProps) {
  const safePercentage = Math.max(0, Math.min(100, Math.round(Number(percentage) || 0)));

  // Styling according to calibrated tiers
  let colorClasses = 'bg-slate-900/80 text-white border-slate-700';
  let dotColor = 'bg-slate-400';

  if (safePercentage >= 85) {
    colorClasses = 'bg-emerald-600/90 text-white border-emerald-400/50 shadow-emerald-500/20';
    dotColor = 'bg-emerald-300';
  } else if (safePercentage >= 70) {
    colorClasses = 'bg-blue-600/90 text-white border-blue-400/50 shadow-blue-500/20';
    dotColor = 'bg-blue-300';
  } else if (safePercentage >= 50) {
    colorClasses = 'bg-amber-600/90 text-white border-amber-400/50 shadow-amber-500/20';
    dotColor = 'bg-amber-300';
  }

  const isSmall = size === 'sm';

  return (
    <div
      className={`inline-flex items-center gap-1.5 font-bold tracking-tight rounded-full border backdrop-blur-md shadow-sm transition-all ${
        isSmall ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } ${colorClasses}`}
      title={`AI Visual Similarity: ${safePercentage}% (${tier || 'Visual Match'})`}
    >
      <Sparkles className={isSmall ? 'w-3 h-3 text-amber-300' : 'w-3.5 h-3.5 text-amber-300'} />
      <span className="font-extrabold">{safePercentage}%</span>
      {tier && (
        <>
          <span className={`w-1 h-1 rounded-full ${dotColor}`} />
          <span className="font-medium opacity-90 truncate max-w-[120px]">{tier}</span>
        </>
      )}
    </div>
  );
}

import React from 'react';
import { Camera, Sparkles } from 'lucide-react';

interface CameraSearchButtonProps {
  onClick: () => void;
  className?: string;
  variant?: 'compact' | 'expanded';
}

export default function CameraSearchButton({
  onClick,
  className = '',
  variant = 'compact'
}: CameraSearchButtonProps) {
  if (variant === 'expanded') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Craffle AI Camera Search"
        title="Craffle AI Camera Search — Search by image or photo"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-[#FF6B35] border border-orange-500/25 transition-all text-xs font-bold cursor-pointer shrink-0 shadow-sm ${className}`}
      >
        <div className="relative">
          <Camera className="w-4 h-4 text-[#FF6B35]" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
        </div>
        <span>Camera Search</span>
        <span className="text-[10px] bg-[#FF6B35] text-white px-1.5 py-0.2 rounded-full font-black">
          AI
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Craffle AI Camera Search"
      title="Search by image or photo (Craffle AI Camera Search)"
      className={`relative p-2 rounded-full text-[var(--muted)] hover:text-[#FF6B35] hover:bg-orange-500/10 transition-all cursor-pointer shrink-0 flex items-center justify-center ${className}`}
    >
      <Camera className="w-4.5 h-4.5" />
      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF6B35]" />
    </button>
  );
}

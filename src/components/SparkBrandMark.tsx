import React from 'react';
import { ThemePresetId } from '../types';
import { THEME_PRESETS } from '../utils/auth';

interface SparkBrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
  theme?: ThemePresetId;
}

export function SparkBrandMark({ size = 'md', theme = 'cobalt' }: SparkBrandMarkProps) {
  const palette = THEME_PRESETS[theme];
  const dims =
    size === 'sm'
      ? 'h-8 w-8 rounded-md p-1'
      : size === 'lg'
        ? 'h-12 w-12 rounded-xl p-1.5'
        : 'h-9 w-9 rounded-lg p-1';

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-black/10 ${dims}`}
      style={{ backgroundColor: palette.swatchHex }}
      aria-hidden="true"
    >
      <img
        src={`${import.meta.env.BASE_URL}assets/spark-lineart-white.png`}
        alt=""
        className="h-full w-full object-contain"
        referrerPolicy="no-referrer"
      />
      <span
        className="absolute bottom-0.5 left-2 right-2 h-[2px] rounded-full"
        style={{ backgroundColor: palette.accentHex }}
      />
    </span>
  );
}

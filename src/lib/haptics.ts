type HapticIntensity = 'light' | 'medium' | 'strong';

const patterns: Record<HapticIntensity, number | number[]> = {
  light: 50,
  medium: 100,
  strong: 200,
};

export function vibrate(intensity: HapticIntensity = 'light'): void {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(patterns[intensity]);
    } catch {
      // Silently fail - haptics are optional
    }
  }
}

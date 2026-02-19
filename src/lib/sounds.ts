type SoundName = 'tile-click' | 'discard' | 'call' | 'win';

const audioElements: Map<SoundName, HTMLAudioElement> = new Map();
let soundsEnabled = true;

// Preload sounds
export function initSounds(): void {
  const sounds: SoundName[] = ['tile-click', 'discard', 'call', 'win'];

  sounds.forEach(name => {
    try {
      const audio = new Audio(`/sounds/${name}.mp3`);
      audio.preload = 'auto';
      audio.volume = 0.5;
      // Only add to map if file loads successfully
      audio.addEventListener('canplaythrough', () => {
        audioElements.set(name, audio);
      });
      audio.addEventListener('error', () => {
        // Sound file not found - fail silently
      });
    } catch {
      // Sound initialization failed - fail silently
    }
  });
}

export function playSound(name: SoundName): void {
  if (!soundsEnabled) return;

  const audio = audioElements.get(name);
  if (audio) {
    // Reset and play
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Autoplay blocked - ignore silently
    });
  }
}

export function setSoundsEnabled(enabled: boolean): void {
  soundsEnabled = enabled;
}

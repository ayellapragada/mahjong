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
      audioElements.set(name, audio);
    } catch {
      console.warn(`Failed to load sound: ${name}`);
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

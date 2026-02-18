<script lang="ts">
  interface Props {
    onCreateRoom: () => void;
    onJoinRoom: (roomCode: string) => void;
  }

  let { onCreateRoom, onJoinRoom }: Props = $props();

  let roomCode = $state("");

  function handleJoin() {
    if (roomCode.length === 4) {
      onJoinRoom(roomCode.toUpperCase());
    }
  }
</script>

<div class="home">
  <!-- Corner decorations -->
  <span class="corner-char top-left">麻</span>
  <span class="corner-char top-right">雀</span>
  <span class="corner-char bottom-left">牌</span>
  <span class="corner-char bottom-right">局</span>

  <div class="hero">
    <h1 class="logo-chinese">麻雀</h1>
    <p class="tagline">Hong Kong Style · 4 Players</p>
  </div>

  <div class="actions">
    <button class="btn btn-primary" onclick={onCreateRoom}>
      Create Room
    </button>

    <div class="divider">
      <span>or join</span>
    </div>

    <div class="join-group">
      <input
        type="text"
        bind:value={roomCode}
        placeholder="Room Code"
        maxlength="4"
        onkeydown={(e) => e.key === 'Enter' && handleJoin()}
      />
      <button
        class="btn btn-secondary"
        onclick={handleJoin}
        disabled={roomCode.length !== 4}
      >
        Join
      </button>
    </div>
  </div>
</div>

<style>
  .home {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl);
    background: linear-gradient(180deg, #0a2a1a 0%, #0d3320 50%, #0a2a1a 100%);
    position: relative;
    overflow: hidden;
  }

  /* Subtle radial glow in center */
  .home::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 120%;
    height: 120%;
    background: radial-gradient(ellipse at center, rgba(212, 168, 75, 0.08) 0%, transparent 50%);
    pointer-events: none;
  }

  /* Corner decorations */
  .corner-char {
    position: absolute;
    font-size: clamp(4rem, 15vw, 8rem);
    font-family: 'Crimson Pro', serif;
    color: rgba(255, 255, 255, 0.03);
    pointer-events: none;
    user-select: none;
    line-height: 1;
  }

  .top-left {
    top: var(--space-lg);
    left: var(--space-lg);
  }

  .top-right {
    top: var(--space-lg);
    right: var(--space-lg);
  }

  .bottom-left {
    bottom: var(--space-lg);
    left: var(--space-lg);
  }

  .bottom-right {
    bottom: var(--space-lg);
    right: var(--space-lg);
  }

  .hero {
    text-align: center;
    margin-bottom: var(--space-xl);
    position: relative;
    z-index: 1;
  }

  .logo-chinese {
    font-family: 'Crimson Pro', Georgia, serif;
    font-size: clamp(4rem, 15vw, 6rem);
    font-weight: 700;
    color: var(--gold);
    margin: 0;
    letter-spacing: 0.1em;
    text-shadow:
      0 2px 20px rgba(212, 168, 75, 0.5),
      0 0 60px rgba(212, 168, 75, 0.3);
    animation: glow 3s ease-in-out infinite;
  }

  @keyframes glow {
    0%, 100% {
      text-shadow:
        0 2px 20px rgba(212, 168, 75, 0.5),
        0 0 60px rgba(212, 168, 75, 0.3);
    }
    50% {
      text-shadow:
        0 2px 30px rgba(212, 168, 75, 0.7),
        0 0 80px rgba(212, 168, 75, 0.4);
    }
  }

  .tagline {
    font-family: var(--font-body);
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: var(--space-md) 0 0 0;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    width: 100%;
    max-width: 320px;
    position: relative;
    z-index: 1;
  }

  .divider {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    color: var(--text-muted);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
  }

  .join-group {
    display: flex;
    gap: var(--space-sm);
    width: 100%;
  }

  input {
    flex: 1;
    min-width: 0;
    padding: 1rem var(--space-md);
    font-size: 1rem;
    font-family: var(--font-body);
    font-weight: 600;
    letter-spacing: 0.2em;
    text-align: center;
    text-transform: uppercase;
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }

  input::placeholder {
    color: var(--text-muted);
    letter-spacing: 0.1em;
    text-transform: none;
  }

  input:focus {
    border-color: var(--gold);
    background: rgba(0, 0, 0, 0.4);
    box-shadow: 0 0 0 3px rgba(212, 168, 75, 0.15);
  }

  .btn {
    padding: 1rem var(--space-xl);
    font-size: 1rem;
    font-family: var(--font-body);
    font-weight: 600;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .btn-primary {
    width: 100%;
    background: linear-gradient(135deg, var(--gold) 0%, #c9973f 100%);
    color: #1a0f0a;
    box-shadow:
      0 4px 16px rgba(212, 168, 75, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  .btn-primary:hover {
    background: linear-gradient(135deg, var(--gold-bright) 0%, var(--gold) 100%);
    transform: translateY(-2px);
    box-shadow:
      0 6px 24px rgba(212, 168, 75, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  .btn-primary:active {
    transform: translateY(0);
  }

  .btn-secondary {
    flex-shrink: 0;
    padding: 1rem var(--space-lg);
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
    border: 2px solid rgba(255, 255, 255, 0.1);
  }

  .btn-secondary:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 480px) {
    .home {
      padding: var(--space-lg);
    }

    .corner-char {
      font-size: 3rem;
    }

    .logo-chinese {
      font-size: 3.5rem;
    }

    .actions {
      max-width: 280px;
    }
  }
</style>

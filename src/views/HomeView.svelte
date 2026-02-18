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
      Start Table
    </button>
    <p class="action-hint">Set up the shared table display</p>

    <div class="divider">
      <span>or join as player</span>
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
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    padding-top: calc(40px + env(safe-area-inset-top, 0px));
    padding-bottom: calc(40px + env(safe-area-inset-bottom, 0px));
    padding-left: calc(40px + env(safe-area-inset-left, 0px));
    padding-right: calc(40px + env(safe-area-inset-right, 0px));
    background: linear-gradient(180deg, #0a2a1a 0%, #0d3320 50%, #0a2a1a 100%);
    overflow: hidden;
    box-sizing: border-box;
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
    font-size: clamp(4rem, 12vw, 14rem);
    font-family: 'Crimson Pro', serif;
    color: rgba(255, 255, 255, 0.03);
    pointer-events: none;
    user-select: none;
    line-height: 1;
  }

  .top-left {
    top: clamp(16px, 3vw, 48px);
    left: clamp(16px, 3vw, 48px);
  }

  .top-right {
    top: clamp(16px, 3vw, 48px);
    right: clamp(16px, 3vw, 48px);
  }

  .bottom-left {
    bottom: clamp(16px, 3vw, 48px);
    left: clamp(16px, 3vw, 48px);
  }

  .bottom-right {
    bottom: clamp(16px, 3vw, 48px);
    right: clamp(16px, 3vw, 48px);
  }

  .hero {
    text-align: center;
    margin-bottom: var(--space-xl);
    position: relative;
    z-index: 1;
  }

  .logo-chinese {
    font-family: 'Crimson Pro', Georgia, serif;
    font-size: clamp(4rem, 15vw, 12rem);
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
    font-size: clamp(0.9rem, 1.5vw, 1.4rem);
    color: var(--text-secondary);
    margin: var(--space-md) 0 0 0;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: clamp(12px, 2vw, 24px);
    width: 100%;
    max-width: clamp(280px, 40vw, 500px);
    position: relative;
    z-index: 1;
  }

  .action-hint {
    font-size: clamp(0.75rem, 1.2vw, 1.1rem);
    color: var(--text-muted);
    text-align: center;
    margin: calc(-1 * var(--space-sm)) 0 0 0;
  }

  .divider {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    color: var(--text-muted);
    font-size: clamp(0.75rem, 1.2vw, 1rem);
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
    gap: clamp(8px, 1vw, 16px);
    width: 100%;
  }

  input {
    flex: 1;
    min-width: 0;
    padding: clamp(12px, 1.5vw, 20px) clamp(12px, 1.5vw, 24px);
    font-size: clamp(1rem, 1.5vw, 1.4rem);
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
    padding: clamp(12px, 1.5vw, 20px) clamp(20px, 3vw, 40px);
    font-size: clamp(1rem, 1.5vw, 1.4rem);
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
    padding: clamp(12px, 1.5vw, 20px) clamp(16px, 2vw, 32px);
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
      padding: 16px;
      padding-top: calc(16px + env(safe-area-inset-top, 0px));
      padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    }

    .corner-char {
      font-size: 2.5rem;
    }

    .logo-chinese {
      font-size: 3rem;
    }

    .tagline {
      font-size: 0.75rem;
    }

    .hero {
      margin-bottom: 24px;
    }

    .actions {
      max-width: 100%;
      width: 100%;
      gap: 12px;
    }

    .btn {
      padding: 14px 20px;
      font-size: 0.9rem;
    }

    .btn-secondary {
      padding: 14px 16px;
    }

    input {
      padding: 14px 12px;
      font-size: 0.95rem;
    }

    .action-hint {
      font-size: 0.7rem;
    }

    .divider {
      font-size: 0.7rem;
      margin: 4px 0;
    }
  }

  /* Very small phones */
  @media (max-width: 350px) {
    .home {
      padding: 12px;
    }

    .logo-chinese {
      font-size: 2.5rem;
    }

    .corner-char {
      font-size: 2rem;
      display: none;
    }

    .btn {
      padding: 12px 16px;
      font-size: 0.85rem;
    }

    input {
      padding: 12px 10px;
    }
  }
</style>

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
  <div class="hero">
    <div class="logo">
      <span class="logo-tile">🀄</span>
      <h1>Mahjong</h1>
    </div>
    <p class="tagline">Hong Kong Style</p>
  </div>

  <div class="cards">
    <div class="card">
      <div class="card-icon">🎲</div>
      <h2>New Game</h2>
      <p>Create a room and invite friends to play</p>
      <button class="btn btn-primary" onclick={onCreateRoom}>
        Create Room
      </button>
    </div>

    <div class="divider">
      <span>or</span>
    </div>

    <div class="card">
      <div class="card-icon">🚪</div>
      <h2>Join Game</h2>
      <p>Enter a 4-letter room code</p>
      <div class="input-group">
        <input
          type="text"
          bind:value={roomCode}
          placeholder="ABCD"
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

  <footer>
    <div class="decorative-tiles">
      <span>🀙</span><span>🀚</span><span>🀛</span><span>🀜</span><span>🀝</span>
    </div>
  </footer>
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
    background:
      radial-gradient(ellipse at 30% 20%, rgba(45, 134, 89, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 80%, rgba(212, 168, 75, 0.1) 0%, transparent 50%),
      linear-gradient(180deg, var(--bg-deep) 0%, #0d0806 100%);
    position: relative;
    overflow: hidden;
  }

  .home::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L30 60M0 30L60 30' stroke='%23ffffff' stroke-width='0.5' stroke-opacity='0.03'/%3E%3C/svg%3E");
    pointer-events: none;
  }

  .hero {
    text-align: center;
    margin-bottom: var(--space-xl);
    position: relative;
    z-index: 1;
  }

  .logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
  }

  .logo-tile {
    font-size: 3.5rem;
    filter: drop-shadow(0 0 30px var(--gold));
    animation: float 3s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  h1 {
    font-family: 'Crimson Pro', Georgia, serif;
    font-size: 3.5rem;
    font-weight: 700;
    color: var(--gold);
    margin: 0;
    letter-spacing: 0.05em;
    text-shadow: 0 2px 20px rgba(212, 168, 75, 0.4);
  }

  .tagline {
    font-family: 'Crimson Pro', Georgia, serif;
    font-size: 1.1rem;
    color: var(--text-secondary);
    margin: var(--space-sm) 0 0 0;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    width: 100%;
    max-width: 380px;
    position: relative;
    z-index: 1;
  }

  .card {
    background:
      linear-gradient(135deg, rgba(42, 24, 16, 0.95) 0%, rgba(26, 15, 10, 0.95) 100%);
    border: 1px solid rgba(212, 168, 75, 0.2);
    border-radius: var(--radius-xl);
    padding: var(--space-lg);
    text-align: center;
    backdrop-filter: blur(10px);
    box-shadow:
      0 4px 24px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      0 0 40px rgba(212, 168, 75, 0.1);
  }

  .card-icon {
    font-size: 2rem;
    margin-bottom: var(--space-sm);
    opacity: 0.9;
  }

  .card h2 {
    font-family: 'Crimson Pro', Georgia, serif;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 var(--space-xs) 0;
  }

  .card p {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0 0 var(--space-md) 0;
  }

  .divider {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    color: var(--text-muted);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--text-muted), transparent);
  }

  .input-group {
    display: flex;
    gap: var(--space-sm);
  }

  input {
    flex: 1;
    padding: 0.875rem var(--space-md);
    font-size: 1.25rem;
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    letter-spacing: 0.3em;
    text-align: center;
    text-transform: uppercase;
    background: rgba(0, 0, 0, 0.4);
    border: 2px solid rgba(212, 168, 75, 0.3);
    border-radius: var(--radius-md);
    color: var(--gold-bright);
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  input::placeholder {
    color: var(--text-muted);
    letter-spacing: 0.3em;
  }

  input:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px rgba(212, 168, 75, 0.15);
  }

  .btn {
    padding: 0.875rem var(--space-lg);
    font-size: 1rem;
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .btn-primary {
    width: 100%;
    background: linear-gradient(135deg, var(--gold) 0%, var(--gold-dim) 100%);
    color: var(--bg-deep);
    box-shadow:
      0 4px 12px rgba(212, 168, 75, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .btn-primary:hover {
    background: linear-gradient(135deg, var(--gold-bright) 0%, var(--gold) 100%);
    transform: translateY(-1px);
    box-shadow:
      0 6px 20px rgba(212, 168, 75, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .btn-secondary {
    background: linear-gradient(135deg, var(--jade) 0%, #1f5c3d 100%);
    color: var(--text-primary);
    box-shadow: 0 4px 12px rgba(45, 134, 89, 0.3);
  }

  .btn-secondary:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--jade-bright) 0%, var(--jade) 100%);
    transform: translateY(-1px);
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  footer {
    position: absolute;
    bottom: var(--space-xl);
    left: 0;
    right: 0;
    text-align: center;
  }

  .decorative-tiles {
    display: flex;
    justify-content: center;
    gap: var(--space-sm);
    font-size: 1.5rem;
    opacity: 0.15;
  }

  .decorative-tiles span {
    animation: sway 4s ease-in-out infinite;
  }

  .decorative-tiles span:nth-child(1) { animation-delay: 0s; }
  .decorative-tiles span:nth-child(2) { animation-delay: 0.2s; }
  .decorative-tiles span:nth-child(3) { animation-delay: 0.4s; }
  .decorative-tiles span:nth-child(4) { animation-delay: 0.6s; }
  .decorative-tiles span:nth-child(5) { animation-delay: 0.8s; }

  @keyframes sway {
    0%, 100% { transform: translateY(0) rotate(-2deg); }
    50% { transform: translateY(-4px) rotate(2deg); }
  }

  @media (max-width: 480px) {
    .home {
      padding: var(--space-lg);
    }

    h1 {
      font-size: 2.5rem;
    }

    .logo-tile {
      font-size: 2.5rem;
    }

    .card {
      padding: var(--space-md);
    }
  }
</style>

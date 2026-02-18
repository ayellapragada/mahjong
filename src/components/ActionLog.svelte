<script lang="ts">
  import type { GameAction, Seat } from "../game/types";
  import { tileToShortCode } from "../lib/tiles";

  interface Props {
    actions: GameAction[];
    mySeat: Seat;
  }

  let { actions, mySeat }: Props = $props();

  const WIND_CHARS = ['E', 'S', 'W', 'N'] as const;

  function formatAction(action: GameAction): string {
    const playerLabel = action.seat === mySeat ? 'You' : action.playerName;
    const tile = action.tile ? tileToShortCode(action.tile.tile) : '';

    switch (action.type) {
      case 'discard':
        return `${playerLabel} discarded ${tile}`;
      case 'chi':
        return `${playerLabel} chi'd ${tile}`;
      case 'peng':
        return `${playerLabel} peng'd ${tile}`;
      case 'gang':
        return `${playerLabel} gang'd ${tile}`;
      case 'win':
        return `${playerLabel} won!`;
      case 'draw':
        return `${playerLabel} drew`;
      case 'pass':
        return `${playerLabel} passed`;
      case 'game_start':
        return 'Game started';
      case 'round_start':
        return 'Round started';
      default:
        return `${playerLabel} ${action.type}`;
    }
  }

  function getActionClass(action: GameAction): string {
    if (action.seat === mySeat) return 'my-action';
    if (action.type === 'chi' || action.type === 'peng' || action.type === 'gang') return 'call-action';
    if (action.type === 'win') return 'win-action';
    return '';
  }
</script>

<div class="action-log">
  <div class="log-header">Game Log</div>
  <div class="log-entries">
    {#each actions.slice().reverse() as action}
      <div class="log-entry {getActionClass(action)}">
        <span class="wind-badge">{WIND_CHARS[action.seat]}</span>
        <span class="action-text">{formatAction(action)}</span>
      </div>
    {/each}
    {#if actions.length === 0}
      <div class="log-empty">No actions yet</div>
    {/if}
  </div>
</div>

<style>
  .action-log {
    background: rgba(0, 0, 0, 0.4);
    border-radius: var(--radius-md);
    padding: var(--space-xs);
    font-size: 0.75rem;
  }

  .log-header {
    font-family: var(--font-body);
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.6rem;
    margin-bottom: var(--space-xs);
    padding-bottom: 2px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .log-entries {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .log-entry {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 4px;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
  }

  .log-entry.my-action {
    background: rgba(100, 180, 130, 0.15);
    color: var(--text-primary);
  }

  .log-entry.call-action {
    background: rgba(212, 168, 75, 0.15);
    color: var(--gold);
  }

  .log-entry.win-action {
    background: rgba(255, 215, 0, 0.2);
    color: #ffd700;
    font-weight: 600;
  }

  .wind-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 2px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 0.55rem;
    flex-shrink: 0;
  }

  .action-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .log-empty {
    color: var(--text-muted);
    font-style: italic;
    text-align: center;
    padding: var(--space-xs);
  }

  /* Scrollbar styling */
  .action-log::-webkit-scrollbar {
    width: 4px;
  }

  .action-log::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 2px;
  }

  .action-log::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }
</style>

<script lang="ts">
  import type { ConnectionState } from "../lib/connection";

  interface Props {
    state: ConnectionState;
    onRetry: () => void;
  }

  let { state, onRetry }: Props = $props();

  let isReconnecting = $derived(state.status === "reconnecting");
  let showStatus = $derived(state.status === "reconnecting" || state.status === "connecting");
</script>

{#if showStatus}
  <div class="connection-status" class:reconnecting={isReconnecting}>
    <div class="status-content">
      {#if state.status === "reconnecting"}
        <div class="spinner"></div>
        <span>Reconnecting... ({state.attempt}/{state.maxAttempts})</span>
      {:else if state.status === "connecting"}
        <div class="spinner"></div>
        <span>Connecting...</span>
      {/if}
    </div>
    {#if isReconnecting}
      <button class="retry-btn" onclick={onRetry}>Retry Now</button>
    {/if}
  </div>
{/if}

<style>
  .connection-status {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 8px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 9998;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.85);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    animation: slideDown 0.3s ease;
  }

  .connection-status.reconnecting {
    border-color: var(--gold-dim);
  }

  .status-content {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: var(--gold);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .retry-btn {
    padding: 4px 10px;
    font-family: var(--font-body);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--gold);
    background: transparent;
    border: 1px solid var(--gold-dim);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .retry-btn:hover {
    background: rgba(212, 168, 75, 0.15);
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>

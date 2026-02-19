<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  let isFullscreen = $state(false);
  let isSupported = $state(false);

  function handleFullscreenChange() {
    isFullscreen = !!document.fullscreenElement;
  }

  async function toggleFullscreen() {
    try {
      if (isFullscreen) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.error("Fullscreen error:", e);
    }
  }

  onMount(() => {
    isSupported = document.fullscreenEnabled ?? false;
    isFullscreen = !!document.fullscreenElement;
    document.addEventListener("fullscreenchange", handleFullscreenChange);
  });

  onDestroy(() => {
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
  });
</script>

{#if isSupported}
  <button
    class="fullscreen-btn"
    onclick={toggleFullscreen}
    title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
    aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
  >
    {#if isFullscreen}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
      </svg>
    {:else}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
      </svg>
    {/if}
  </button>
{/if}

<style>
  .fullscreen-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--gold-dim);
    border-radius: var(--radius-sm);
    color: var(--gold);
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
  }

  .fullscreen-btn:hover {
    background: rgba(212, 168, 75, 0.15);
    border-color: var(--gold);
    box-shadow: 0 0 10px rgba(212, 168, 75, 0.3);
  }

  .fullscreen-btn:active {
    transform: scale(0.95);
  }

  .fullscreen-btn svg {
    width: 18px;
    height: 18px;
  }

  @media (max-width: 600px) {
    .fullscreen-btn {
      width: 28px;
      height: 28px;
    }

    .fullscreen-btn svg {
      width: 14px;
      height: 14px;
    }
  }
</style>

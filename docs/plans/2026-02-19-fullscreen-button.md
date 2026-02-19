# Fullscreen Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a fullscreen toggle button to TableView and PlayerHandView headers.

**Architecture:** Create a self-contained Svelte component using the browser Fullscreen API. The component tracks its own state via the `fullscreenchange` event and hides itself on unsupported browsers.

**Tech Stack:** Svelte 5 (runes syntax), Fullscreen API

---

### Task 1: Create FullscreenButton Component

**Files:**
- Create: `src/components/FullscreenButton.svelte`

**Step 1: Create the component file**

```svelte
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
```

**Step 2: Run TypeScript check**

Run: `npm run check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/FullscreenButton.svelte
git commit -m "feat: add FullscreenButton component"
```

---

### Task 2: Integrate into TableView

**Files:**
- Modify: `src/views/TableView.svelte:1-30` (import and header)

**Step 1: Add import and update header**

At line 4, add import:
```typescript
import FullscreenButton from "../components/FullscreenButton.svelte";
```

At line 27-29, update header to include button:
```svelte
<header>
  <div class="room-badge">{state.roomCode}</div>
  <FullscreenButton />
  <div class="wall-count">{state.wallCount} tiles remaining</div>
</header>
```

**Step 2: Run TypeScript check**

Run: `npm run check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/views/TableView.svelte
git commit -m "feat: add fullscreen button to TableView"
```

---

### Task 3: Integrate into PlayerHandView

**Files:**
- Modify: `src/views/PlayerHandView.svelte:1-10` (import)
- Modify: `src/views/PlayerHandView.svelte:91-95` (header-right section)

**Step 1: Add import**

At line 7, add import:
```typescript
import FullscreenButton from "../components/FullscreenButton.svelte";
```

**Step 2: Add button to header-right section**

At line 91-94, update header-right to include button before history:
```svelte
<div class="header-right">
  <FullscreenButton />
  <button class="history-btn" onclick={() => historyOpen = true}>History</button>
  <div class="room-code">{gameState.roomCode}</div>
</div>
```

**Step 3: Run TypeScript check**

Run: `npm run check`
Expected: No errors

**Step 4: Commit**

```bash
git add src/views/PlayerHandView.svelte
git commit -m "feat: add fullscreen button to PlayerHandView"
```

---

### Task 4: Manual Verification

**Step 1: Start dev server**

Run: `npm run dev:all`

**Step 2: Test TableView fullscreen**

1. Create a room (table view)
2. Verify fullscreen button appears in header
3. Click button - verify enters fullscreen
4. Verify icon changes to compress arrows
5. Click button again - verify exits fullscreen
6. Verify icon changes back to expand arrows

**Step 3: Test PlayerHandView fullscreen**

1. Join the room from another browser tab
2. Verify fullscreen button appears in header-right area
3. Click button - verify enters fullscreen
4. Verify icon changes
5. Click button again - verify exits fullscreen

**Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: fullscreen button adjustments"
```

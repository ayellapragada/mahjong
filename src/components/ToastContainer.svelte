<script lang="ts">
  import { getToasts } from "../lib/toast.svelte";

  let toasts = $derived(getToasts());
</script>

<div class="toast-container">
  {#each toasts as toast (toast.id)}
    <div class="toast toast-{toast.type}" role="alert">
      {toast.message}
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: env(safe-area-inset-top, 16px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: calc(100vw - 32px);
    pointer-events: none;
  }

  .toast {
    padding: 12px 20px;
    border-radius: 8px;
    font-family: var(--font-body);
    font-size: 0.9rem;
    font-weight: 500;
    text-align: center;
    animation: slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .toast-error {
    background: linear-gradient(135deg, #c41e3a 0%, #8b0000 100%);
    color: white;
  }

  .toast-warning {
    background: linear-gradient(135deg, #d4a84b 0%, #a07830 100%);
    color: #1a0f0a;
  }

  .toast-success {
    background: linear-gradient(135deg, #2d8659 0%, #1a5038 100%);
    color: white;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>

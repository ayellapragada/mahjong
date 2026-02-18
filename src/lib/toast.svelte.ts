type ToastType = 'error' | 'warning' | 'success';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let toasts: Toast[] = $state([]);
let nextId = 0;

export function showToast(message: string, type: ToastType = 'error', duration = 4000) {
  const id = nextId++;
  toasts = [...toasts, { id, message, type }];

  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
  }, duration);
}

export function getToasts() {
  return toasts;
}

// Convenience functions
export const toast = {
  error: (msg: string) => showToast(msg, 'error'),
  warning: (msg: string) => showToast(msg, 'warning'),
  success: (msg: string) => showToast(msg, 'success'),
};

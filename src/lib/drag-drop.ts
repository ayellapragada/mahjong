// src/lib/drag-drop.ts

export interface DragDropConfig {
  itemSelector: string;  // CSS selector for draggable items
  ghostClass?: string;   // Class to add to ghost element
}

export interface DragDropState {
  draggedId: string | null;
  dropTargetIndex: number | null;
  touchDragId: string | null;
  ghostElement: HTMLDivElement | null;
}

export function createDragDropState(): DragDropState {
  return {
    draggedId: null,
    dropTargetIndex: null,
    touchDragId: null,
    ghostElement: null,
  };
}

export function handleDragStart(
  state: DragDropState,
  e: DragEvent,
  id: string
): DragDropState {
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }
  return { ...state, draggedId: id };
}

export function handleDragOver(
  state: DragDropState,
  e: DragEvent,
  index: number
): DragDropState {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
  return { ...state, dropTargetIndex: index };
}

export function handleDragLeave(state: DragDropState): DragDropState {
  return { ...state, dropTargetIndex: null };
}

export function handleDrop<T extends { id: string }>(
  state: DragDropState,
  e: DragEvent,
  targetIndex: number,
  order: string[],
  setOrder: (newOrder: string[]) => void
): DragDropState {
  e.preventDefault();

  if (state.draggedId === null) {
    return { ...state, dropTargetIndex: null };
  }

  const draggedIndex = order.indexOf(state.draggedId);
  if (draggedIndex === -1 || draggedIndex === targetIndex) {
    return { ...state, dropTargetIndex: null };
  }

  const newOrder = [...order];
  newOrder.splice(draggedIndex, 1);
  newOrder.splice(targetIndex, 0, state.draggedId);
  setOrder(newOrder);

  return { ...state, dropTargetIndex: null };
}

export function handleDragEnd(state: DragDropState): DragDropState {
  return { ...state, draggedId: null, dropTargetIndex: null };
}

export function handleTouchStart(
  state: DragDropState,
  e: TouchEvent,
  id: string
): DragDropState {
  const touch = e.touches[0];
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();

  e.preventDefault();

  const ghost = document.createElement('div');
  ghost.className = 'touch-ghost';
  ghost.innerHTML = target.innerHTML;
  ghost.style.cssText = `
    position: fixed;
    left: ${rect.left}px;
    top: ${rect.top}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    pointer-events: none;
    z-index: 1000;
    opacity: 0.8;
    transform: scale(1.1);
    transition: transform 0.1s ease;
  `;
  document.body.appendChild(ghost);

  return {
    ...state,
    touchDragId: id,
    ghostElement: ghost,
  };
}

export function handleTouchMove(
  state: DragDropState,
  e: TouchEvent,
  itemSelector: string
): DragDropState {
  if (!state.touchDragId || !state.ghostElement) return state;
  e.preventDefault();

  const touch = e.touches[0];
  const rect = state.ghostElement.getBoundingClientRect();

  state.ghostElement.style.left = `${touch.clientX - rect.width / 2}px`;
  state.ghostElement.style.top = `${touch.clientY - rect.height / 2}px`;

  const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
  const dropTarget = elements.find(el =>
    el.matches(itemSelector) && !el.classList.contains('dragging')
  ) as HTMLElement | undefined;

  document.querySelectorAll(`${itemSelector}.drag-over`).forEach(el =>
    el.classList.remove('drag-over')
  );

  let dropTargetIndex: number | null = null;
  if (dropTarget) {
    const index = Array.from(dropTarget.parentElement?.children || []).indexOf(dropTarget);
    dropTargetIndex = index;
    dropTarget.classList.add('drag-over');
  }

  return { ...state, dropTargetIndex };
}

export function handleTouchEnd(
  state: DragDropState,
  order: string[],
  setOrder: (newOrder: string[]) => void,
  itemSelector: string
): DragDropState {
  if (!state.touchDragId) return state;

  if (state.dropTargetIndex !== null) {
    const draggedIndex = order.indexOf(state.touchDragId);
    if (draggedIndex !== -1 && draggedIndex !== state.dropTargetIndex) {
      const newOrder = [...order];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(state.dropTargetIndex, 0, state.touchDragId);
      setOrder(newOrder);
    }
  }

  if (state.ghostElement) {
    state.ghostElement.remove();
  }

  document.querySelectorAll(`${itemSelector}.drag-over`).forEach(el =>
    el.classList.remove('drag-over')
  );

  return {
    ...state,
    touchDragId: null,
    dropTargetIndex: null,
    ghostElement: null,
  };
}

export function cleanupGhost(state: DragDropState): void {
  if (state.ghostElement) {
    state.ghostElement.remove();
  }
}

import type { SvelteComponent } from 'svelte';
import { writable } from 'svelte/store';

export interface Popup {
  id: string;
  title?: string;
  contentComponent: typeof SvelteComponent;
  props?: Record<string, unknown>;
  onClose(data: { detail: unknown }): void;
  containerComponent?: typeof SvelteComponent;
  cancelable?: boolean;
}

export const popups = writable<Popup[]>([]);

export async function showPopup<T>(promptMetadata: Omit<Popup, 'id' | 'onClose'>) {
  return new Promise<T>(resolve => {
    const id = crypto.randomUUID();
    popups.update($popups => [
      ...$popups,
      {
        id,
        ...promptMetadata,
        onClose: data => {
          popups.update(a => a.filter(p => p.id !== id));
          resolve(data.detail as T);
        },
      },
    ]);
  });
}

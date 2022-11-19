import type { StartStopNotifier } from 'svelte/store';
import { writable } from 'svelte/store';

export function writableWithMap<T>(
  initial: T,
  mapper: (value: T) => T,
  startStopNofifier?: StartStopNotifier<T>
) {
  const { subscribe, set, update } = writable(initial, startStopNofifier);
  return {
    subscribe,
    set: (value: T) => set(mapper(value)),
    update: (updater: (value: T) => T) => update(value => mapper(updater(value))),
  };
}

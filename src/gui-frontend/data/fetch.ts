// data handling library :)

import type { Readable } from 'svelte/store';
import { derived, readable } from 'svelte/store';

const listeners = new Set<(any: any) => void>();

const BASE_URL = 'http://localhost:2004';

const map = new Map<string, Promise<unknown> | unknown>();

export async function fetchJSON<T>(endpoint: string, force = false): Promise<T> {
  if (map.has(endpoint) && !force) {
    return map.get(endpoint) as Promise<T>;
  }
  const promise = fetch(BASE_URL + endpoint).then(res => res.json());
  map.set(endpoint, promise);
  const result = await promise;
  map.set(endpoint, result);
  return result;
}

export async function fetchBuffer(endpoint: string) {
  return fetch(BASE_URL + endpoint).then(res => res.arrayBuffer());
}

export async function postJSON<T>(endpoint: string, body: any): Promise<T> {
  return fetch(BASE_URL + endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).then(res => res.json());
}

export function getCacheEntry<T>(endpoint: string): T {
  if (!map.has(endpoint)) {
    throw new Error(`No cache entry for ${endpoint}`);
  }
  if (map.get(endpoint) instanceof Promise) {
    throw new Error(`Cache entry for ${endpoint} is not ready`);
  }
  return map.get(endpoint) as T;
}

export function setCacheEntry(endpoint: string, data: any) {
  map.set(endpoint, data);
  listeners.forEach(fn => fn(getCacheEntry));
}

export function updateCacheEntry(endpoint: string, data: any) {
  const entry = getCacheEntry(endpoint) as any;
  if (entry) {
    setCacheEntry(endpoint, { ...entry, ...data });
  }
}

export const data = readable(getCacheEntry, set => {
  listeners.add(set);
  return () => listeners.delete(set);
});

export interface SimpleDataStore<R> extends Readable<R> {
  get(): R;
  set(value: R): void;
  update(updater: (value: R) => R): void;
  fetch(): Promise<R>;
  fetch(force: boolean): Promise<R>;
}

export interface DataStore<T extends Array<string | undefined | null | number>, R>
  extends Readable<(...args: T) => R> {
  get(...args: T): R;
  set(...args: [...args: T, value: R]): void;
  update(...args: [...args: T, updater: (value: R) => R]): void;
  fetch(...args: T): Promise<R>;
  fetch(...args: [...args: T, force: boolean]): Promise<R>;
}

export function createSimpleCacheStore<R>(endpoint: string): SimpleDataStore<R> {
  const store = derived(data, $data => $data(endpoint)) as SimpleDataStore<R>;

  store.get = () => getCacheEntry(endpoint);

  store.set = (value: R) => {
    setCacheEntry(endpoint, value);
  };

  store.update = (updater: (data: R) => R) => {
    updateCacheEntry(endpoint, updater(getCacheEntry(endpoint)));
  };

  store.fetch = (async (force = false) => {
    const result = await fetchJSON(endpoint, force as boolean);
    setCacheEntry(endpoint, result);
    return result;
  }) as any;

  return store;
}

export function createCacheStore<T extends Array<string | undefined | null | number>, R>(
  getEndpoint: (...args: T) => string,
  mapData: (data: any) => R
): DataStore<T, R> {
  const store = derived(
    data,
    $data =>
      (...args: T) =>
        mapData($data(getEndpoint(...args)))
  ) as DataStore<T, R>;

  store.get = (...args: T) => getCacheEntry(getEndpoint(...args));

  store.set = (...args: [...T, R]) => {
    const endpoint = getEndpoint(...(args.slice(0, -1) as T));
    setCacheEntry(endpoint, args[args.length - 1]);
  };

  store.update = (...args: [...T, (data: R) => R]) => {
    const endpoint = getEndpoint(...(args.slice(0, -1) as T));
    updateCacheEntry(endpoint, (args[args.length - 1] as any)(getCacheEntry(endpoint)));
  };

  // Lol sorry for types.
  store.fetch = async (...args: any) => {
    let force = false;
    if (typeof args[args.length - 1] === 'boolean') {
      force = args[args.length - 1];
      args = args.slice(0, -1) as T;
    }
    const endpoint = getEndpoint(...args);
    return fetchJSON(endpoint, force);
  };

  return store;
}

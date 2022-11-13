/* eslint-disable @typescript-eslint/no-throw-literal */
/* eslint-disable @typescript-eslint/promise-function-async */
import { useSyncExternalStore } from 'react';

const BASE_URL = 'http://localhost:2004';

type CacheKeyParam = string | number;

export class Store<T extends CacheKeyParam[], R> {
  private map = new Map<string, R>();
  private promises = new Map<string, Promise<R>>();
  private listeners = new Map<string, Array<(newData: R) => void>>();

  constructor(private fetcher: (...args: T) => Promise<R>) {}

  private toId(args: T) {
    return JSON.stringify(args);
  }

  delete(...args: T) {
    this.map.delete(this.toId(args));
  }

  fetch(...args: [...T, boolean]): Promise<R> {
    const last = args.at(-1);
    let cached = true;
    if (typeof last === 'boolean') {
      cached = args.pop() as boolean;
    }
    const id = this.toId(args as any as T);
    const promise = this.promises.get(id);
    if (promise) {
      return promise;
    }
    if (cached && this.map.has(id)) {
      return Promise.resolve(this.map.get(id)!);
    }
    const newPromise = this.fetcher(...(args as any as T)).then(result => {
      this.map.set(id, result);
      this.promises.delete(id);
      this.listeners.get(id)?.forEach(x => x(result));
      return result;
    });
    this.promises.set(id, newPromise);
    return newPromise;
  }

  get(...args: T): R | undefined {
    const id = this.toId(args as any as T);
    return this.map.get(id);
  }

  set(...args: [...T, R]) {
    const id = this.toId(args.slice(0, -1) as any as T);
    const value = args.at(-1) as R;
    this.map.set(id, value);
    this.promises.delete(id);
    this.listeners.get(id)?.forEach(x => x(value));
  }

  read(...args: T): R {
    const id = this.toId(args);
    if (this.promises.has(id)) {
      throw this.promises.get(id);
    }
    if (!this.map.has(id)) {
      throw this.fetch(...args, false);
    }
    return useSyncExternalStore(
      onChange => {
        const array = this.listeners.get(id) ?? [];
        array.push(onChange);
        this.listeners.set(id, array);
        return () => {
          array.splice(array.indexOf(onChange), 1);
          if (array.length === 0) {
            this.listeners.delete(id);
          }
        };
      },
      () => this.map.get(id)!
    );
  }

  invalidate(...args: T) {
    const id = this.toId(args);
    if (this.promises.has(id)) {
      this.promises.get(id)!.then(() => this.invalidate(...args));
      return;
    }
    if (!this.map.has(id)) {
      return;
    }
    if (this.listeners.has(id)) {
      this.fetch(...args, false);
    } else {
      this.map.delete(id);
    }
  }
}

export function jsonFetcher<T extends CacheKeyParam[], R>({
  formatUrl,
  transform,
}: {
  formatUrl(...args: T): string;
  transform(json: any): R;
}): (...args: T) => Promise<R> {
  return async (...args: T) => {
    const response = await fetch(BASE_URL + formatUrl(...args));
    // if (!response.ok) {
    //   throw new Error(response.statusText);
    // }
    const json = await response.json();
    return transform ? transform(json) : json;
  };
}

export async function postJSON<R = any>(url: string, body: any, options?: RequestInit): Promise<R> {
  const response = await fetch(BASE_URL + url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    ...options,
  });
  // if (!response.ok) {
  //   throw new Error(response.statusText);
  // }
  return response.json();
}

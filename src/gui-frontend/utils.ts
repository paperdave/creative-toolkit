/* eslint-disable @typescript-eslint/no-throw-literal */
/* eslint-disable @typescript-eslint/promise-function-async */
import { useCallback, useState, useSyncExternalStore } from 'react';

const BASE_URL = 'http://localhost:2004';

type CacheKeyParam = string | number;

type NullableArray<T extends unknown[]> = {
  [P in keyof T]: T[P] | null;
};

export class Store<T extends CacheKeyParam[], R> {
  private map = new Map<string, R>();
  private promises = new Map<string, Promise<R>>();
  private listeners = new Map<string, Array<(newData: R) => void>>();

  constructor(private fetcher: (...args: T) => Promise<R>) {}

  private toId(args: any[]) {
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

  update(...args: [...T, (old: R) => R]) {
    const updater = args.at(-1) as (old: R) => R;
    const old = this.get(...(args.slice(0, -1) as any as T));
    if (!old) {
      throw 'cannot update non-existent value';
    }
    this.set(...(args.slice(0, -1) as any as T), updater(old));
  }

  read<J extends NullableArray<T>>(...args: J): J extends T ? R : R | null {
    if (args.some(x => x == null)) {
      return useSyncExternalStore(
        () => () => {},
        () => null
      ) as any;
    }
    const id = this.toId(args);
    if (this.promises.has(id)) {
      throw this.promises.get(id);
    }
    if (!this.map.has(id)) {
      throw (this.fetch as any)(...args, false);
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

export interface StateConfig<T extends CacheKeyParam[], R> {
  initialState(...args: T): R;
}

export class State<T extends CacheKeyParam[], R> {
  private map = new Map<string, R>();
  private listeners = new Map<string, Array<(newData: R) => void>>();

  constructor(private config: StateConfig<T, R>) {}

  private toId(args: T) {
    return JSON.stringify(args);
  }

  set(...args: [...T, R]) {
    const id = this.toId(args.slice(0, -1) as any as T);
    const value = args.at(-1) as R;
    this.map.set(id, value);
    this.listeners.get(id)?.forEach(x => x(value));
  }

  get(...args: T): R | undefined {
    const id = this.toId(args as any as T);
    let v = this.map.get(id);
    if (v === undefined) {
      v = this.config.initialState(...args);
      this.map.set(id, v);
    }
    return v;
  }

  use(...args: T): R {
    const id = this.toId(args);
    if (!this.map.has(id)) {
      this.map.set(id, this.config.initialState(...args));
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

  usePair(...args: T): [R, (newValue: R) => void] {
    return [this.use(...args), (newValue: R) => this.set(...args, newValue)];
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

export async function getJSON<R = any>(url: string, options?: RequestInit): Promise<R> {
  const response = await fetch(BASE_URL + url, {
    method: 'GET',
    ...options,
  });
  // if (!response.ok) {
  //   throw new Error(response.statusText);
  // }
  return response.json();
}

export function useLoadingState() {
  const [loading, setLoading] = useState(false);

  return [
    loading,
    useCallback((promise: Promise<any>) => {
      setLoading(true);
      promise.finally(() => setLoading(false));
      return promise;
    }, []),
  ] as const;
}

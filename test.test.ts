import { test } from 'bun:test';
import { setTimeout } from 'node:timers';

test('unref is possible', () => {
  const timer = setTimeout(() => {}, 1000);
  timer.unref();
  clearTimeout(timer);
});

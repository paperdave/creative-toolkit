import { deepEqual } from 'assert';
import { describe, test } from 'bun:test';
import { resolveRange } from './range';

describe('resolveRange', () => {
  test('zero', () => {
    deepEqual(resolveRange(0), [{ start: 0, end: 0 }]);
  });
});

import { deepEqual } from 'assert';
import { describe, test } from 'bun:test';
import { mergeRanges, resolveRange } from './range';

describe('resolveRange', () => {
  test('zero', () => {
    deepEqual(resolveRange(0), [{ start: 0, end: 0 }]);
  });
});

describe('mergeRanges', () => {
  test('on adjacent', () => {
    deepEqual(
      mergeRanges([
        { start: 0, end: 1 },
        { start: 2, end: 3 },
      ]),
      [{ start: 0, end: 3 }]
    );
  });
  test('on overlap', () => {
    deepEqual(
      mergeRanges([
        { start: 0, end: 1 },
        { start: 1, end: 3 },
      ]),
      [{ start: 0, end: 3 }]
    );
  });
  test('not on one apart', () => {
    deepEqual(
      mergeRanges([
        { start: 0, end: 1 },
        { start: 3, end: 3 },
      ]),
      [
        { start: 0, end: 1 },
        { start: 3, end: 3 },
      ]
    );
  });
  test('complex test', () => {
    deepEqual(
      mergeRanges([
        { start: 0, end: 1 },
        { start: 3, end: 3 },
        { start: 2, end: 3 },
        { start: 1, end: 2 },
        { start: 1, end: 2 },
      ]),
      [{ start: 0, end: 3 }]
    );
  });
});

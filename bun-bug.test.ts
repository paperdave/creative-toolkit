import { expect, test } from 'vitest';

test('process.env spread', () => {
  expect(Object.keys({ ...process.env }).length !== 0).toEqual(true);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { nonNegativeQuantity, positiveQuantity } from '../src/utils/materialQuantities.ts';

test('positiveQuantity rejects zero, negatives and non-numeric input', () => {
  assert.equal(positiveQuantity(0), null);
  assert.equal(positiveQuantity(-1), null);
  assert.equal(positiveQuantity('abc'), null);
  assert.equal(positiveQuantity('2.5'), 2.5);
});

test('nonNegativeQuantity accepts zero but rejects negative and non-finite input', () => {
  assert.equal(nonNegativeQuantity(0), 0);
  assert.equal(nonNegativeQuantity('10'), 10);
  assert.equal(nonNegativeQuantity(-1), null);
  assert.equal(nonNegativeQuantity(Infinity), null);
});

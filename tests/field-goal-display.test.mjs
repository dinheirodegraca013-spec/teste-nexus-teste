import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/app/FieldPage.tsx', 'utf8');

test('field dashboard never fabricates a numeric target when no leader goal exists', () => {
  assert.doesNotMatch(
    source,
    /currentLeader\?\.goal_(?:target|cars|houses|presence)\s*\|\|\s*\d+/,
    'A numeric default must not be reported as a real campaign goal',
  );
});

test('field dashboard labels missing goals as undefined rather than zero progress', () => {
  for (const metric of ['contacts', 'cars', 'houses', 'presence']) {
    assert.match(
      source,
      new RegExp(metric + "Percent === null \\? 'Sem meta'"),
      metric + ' should say Sem meta when no target exists',
    );
  }
});

test('unknown goal progress bar does not render NaN or a fake percentage', () => {
  for (const metric of ['contacts', 'cars', 'houses', 'presence']) {
    assert.match(source, new RegExp(metric + "Percent \\?\\? 0"));
  }
});

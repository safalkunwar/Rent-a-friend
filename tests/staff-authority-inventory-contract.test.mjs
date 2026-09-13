import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

test('staff authority inventory is fixed, aggregate-only, and opt-in', async () => {
  const source = await readFile('ops/staff-containment/read-authority-inventory.mjs', 'utf8');
  assert.match(source, /const PROJECT = 'hamrosathi1';/);
  assert.match(source, /--approved-read-only/);
  assert.match(source, /const LIMIT = 1000;/);
  assert.match(source, /aggregateOnly/);
  assert.doesNotMatch(source, /console\.log\([^\n]*uid/i);
  assert.match(source, /noDataMutation/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/app/MeetingsPage.tsx', 'utf8');

test('meetings loading clears data without an organization', () => {
  assert.match(source, /if \(!orgId\) \{[\s\S]*setMeetings\(\[\]\);[\s\S]*setIsLoading\(false\);[\s\S]*return;/);
});

test('meetings page surfaces the service error', () => {
  assert.match(source, /const \{ data, error \} = await meetingsService\.getAll\(orgId\);/);
  assert.match(source, /if \(error\) throw error;/);
});

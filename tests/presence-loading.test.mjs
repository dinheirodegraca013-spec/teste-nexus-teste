import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/app/PresencePage.tsx', 'utf8');

test('presence loading clears tenant data without an organization', () => {
  assert.match(source, /if \(!orgId\) \{[\s\S]*setPresenceLogs\(\[\]\);[\s\S]*setEvents\(\[\]\);[\s\S]*setMeetings\(\[\]\);[\s\S]*setIsLoading\(false\);[\s\S]*return;/);
});

test('presence page surfaces errors from all source queries', () => {
  assert.match(source, /if \(logsRes\.error\) throw logsRes\.error;/);
  assert.match(source, /if \(eventsRes\.error\) throw eventsRes\.error;/);
  assert.match(source, /if \(meetingsRes\.error\) throw meetingsRes\.error;/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/app/IntelligencePage.tsx', 'utf8');

test('intelligence loading clears tenant data without an organization', () => {
  assert.match(source, /if \(!orgId\) \{[\s\S]*setDemands\(\[\]\);[\s\S]*setContacts\(\[\]\);[\s\S]*setLeaders\(\[\]\);[\s\S]*setIsLoading\(false\);[\s\S]*return;/);
});

test('intelligence page surfaces errors from all source queries', () => {
  assert.match(source, /if \(demandsRes\.error\) throw demandsRes\.error;/);
  assert.match(source, /if \(contactsRes\.error\) throw contactsRes\.error;/);
  assert.match(source, /if \(leadersRes\.error\) throw leadersRes\.error;/);
});

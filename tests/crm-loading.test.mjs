import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/app/CrmPage.tsx', 'utf8');

test('CRM loading stops cleanly without an organization', () => {
  assert.match(source, /if \(!orgId\) \{[\s\S]*setContacts\(\[\]\);[\s\S]*setLeaders\(\[\]\);[\s\S]*setIsLoading\(false\);[\s\S]*return;/);
});

test('CRM page surfaces contact and leader query errors', () => {
  assert.match(source, /if \(contactsRes\.error\) throw contactsRes\.error;/);
  assert.match(source, /if \(leadersRes\.error\) throw leadersRes\.error;/);
});

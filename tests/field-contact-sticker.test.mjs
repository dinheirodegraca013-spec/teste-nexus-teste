import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Static regression guard for a data-integrity bug in the React field form.
// This does not replace a browser or authenticated Supabase integration test.
const fieldPage = readFileSync(new URL('../src/pages/app/FieldPage.tsx', import.meta.url), 'utf8');
const contactHandler = fieldPage.split('const handleSaveContact = async')[1]?.split('const handleSaveCar = async')[0];

test('field contact records sticker authorization as a CRM tag, not an applied vehicle sticker', () => {
  assert.ok(contactHandler, 'Contact submit handler must exist');
  assert.match(contactHandler, /wantsSticker\s*\?\s*'adesivo'/);
  assert.match(contactHandler, /crmService\.create\s*\(/);
  assert.doesNotMatch(contactHandler, /stickersService\.createCarSticker\s*\(/);
  assert.doesNotMatch(contactHandler, /status:\s*['"]applied['"]/);
});

test('the separate vehicle form retains explicit sticker registration', () => {
  const vehicleHandler = fieldPage.split('const handleSaveCar = async')[1]?.split('const handleSaveHouse = async')[0];
  assert.ok(vehicleHandler, 'Vehicle submit handler must exist');
  assert.match(vehicleHandler, /stickersService\.createCarSticker\s*\(/);
  assert.match(vehicleHandler, /status:\s*['"]applied['"]/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const leaders = fs.readFileSync('src/pages/app/LeadersPage.tsx', 'utf8');
const stickers = fs.readFileSync('src/pages/app/StickersPage.tsx', 'utf8');

test('leaders loading clears tenant state and surfaces each query error', () => {
  assert.match(leaders, /setLeaders\(\[\]\)/);
  assert.match(leaders, /setCoordinators\(\[\]\)/);
  assert.match(leaders, /setContacts\(\[\]\)/);
  assert.match(leaders, /if \(leadsRes\.error\) throw leadsRes\.error/);
  assert.match(leaders, /if \(coordsRes\.error\) throw coordsRes\.error/);
  assert.match(leaders, /if \(contactsRes\.error\) throw contactsRes\.error/);
});

test('stickers loading clears tenant state and surfaces each query error', () => {
  assert.match(stickers, /setCarStickers\(\[\]\)/);
  assert.match(stickers, /setHouseStickers\(\[\]\)/);
  assert.match(stickers, /if \(carsRes\.error\) throw carsRes\.error/);
  assert.match(stickers, /if \(housesRes\.error\) throw housesRes\.error/);
});

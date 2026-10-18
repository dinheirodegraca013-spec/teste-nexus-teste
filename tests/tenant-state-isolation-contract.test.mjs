import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('GoalsPage clears tenant data and closes the active modal on organization change', async () => {
  const source = await readFile(new URL('../src/pages/app/GoalsPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /setGoals\(\[\]\)/);
  assert.match(source, /setCoordinators\(\[\]\)/);
  assert.match(source, /setIsModalOpen\(false\)/);
  assert.match(source, /\}, \[orgId\]\);/);
});

test('StickersPage clears tenant data and closes tenant-scoped UI on organization change', async () => {
  const source = await readFile(new URL('../src/pages/app/StickersPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /setCarStickers\(\[\]\)/);
  assert.match(source, /setHouseStickers\(\[\]\)/);
  assert.match(source, /setIsCarModalOpen\(false\)/);
  assert.match(source, /setIsHouseModalOpen\(false\)/);
});

test('FileUpload ignores stale image processing results after replacement or removal', async () => {
  const source = await readFile(new URL('../src/components/ui/FileUpload.tsx', import.meta.url), 'utf8');
  assert.match(source, /processGenerationRef/);
  assert.match(source, /processGeneration !== processGenerationRef\.current/);
  assert.match(source, /processGenerationRef\.current \+= 1/);
});

test('EventsPage validates non-negative and consistent attendance values before saving', async () => {
  const source = await readFile(new URL('../src/pages/app/EventsPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /nonNegativeQuantity/);
  assert.match(source, /confirmedAttendees > expectedAttendees/);
  assert.match(source, /expected_attendees: expectedAttendees/);
  assert.match(source, /confirmed_attendees: confirmedAttendees/);
});

test('LeadersPage rejects negative or invalid campaign goals before saving', async () => {
  const source = await readFile(new URL('../src/pages/app/LeadersPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /positiveQuantity/);
  assert.match(source, /nonNegativeQuantity/);
  assert.match(source, /goalTarget === null/);
  assert.match(source, /goal_target: goalTarget/);
  assert.match(source, /goal_reached: goalReached/);
});

test('atomic goal increment migration is tenant-scoped and does not expose public execution', async () => {
  const source = await readFile(new URL('../docs/proposed-migrations/ADD_ATOMIC_GOAL_INCREMENT.sql', import.meta.url), 'utf8');
  assert.match(source, /UPDATE public\.goals/);
  assert.match(source, /organization_id = v_org/);
  assert.match(source, /SECURITY DEFINER/);
  assert.match(source, /REVOKE ALL ON FUNCTION public\.nexus_increment_goal/);
  assert.match(source, /GRANT EXECUTE ON FUNCTION public\.nexus_increment_goal/);
});

test('WhatsApp invite windows cannot access the opener', async () => {
  for (const file of ['CoordinatorsPage.tsx', 'LeadersPage.tsx']) {
    const source = await readFile(new URL(`../src/pages/app/${file}`, import.meta.url), 'utf8');
    assert.match(source, /window\.open\(waUrl, '_blank', 'noopener,noreferrer'\)/);
  }
});

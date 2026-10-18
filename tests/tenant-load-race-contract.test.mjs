import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const file of ['CrmPage.tsx', 'GoalsPage.tsx', 'CoordinatorsPage.tsx', 'LeadersPage.tsx', 'MaterialsPage.tsx', 'MeetingsPage.tsx', 'StickersPage.tsx', 'UsersPage.tsx', 'ReportsPage.tsx', 'DashboardPage.tsx', 'OrganizationsPage.tsx']) {
  test(`${file} ignores stale organization responses`, async () => {
    const source = await readFile(new URL(`../src/pages/app/${file}`, import.meta.url), 'utf8');
    assert.match(source, /useRef/);
    assert.match(source, /loadGenerationRef/);
    assert.match(source, /if \(!isCurrentLoad\(\)\) return;/);
    assert.match(source, /if \(isCurrentLoad\(\)\) setIsLoading\(false\)/);
  });
}

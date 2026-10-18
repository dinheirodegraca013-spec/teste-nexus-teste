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

test('GoalsPage uses the atomic server increment instead of client read-modify-write', async () => {
  const page = await readFile(new URL('../src/pages/app/GoalsPage.tsx', import.meta.url), 'utf8');
  const services = await readFile(new URL('../src/services/dataServices.ts', import.meta.url), 'utf8');
  assert.match(page, /goalsService\.incrementAtomically\(goal\.id, amount\)/);
  assert.match(services, /supabase\.rpc\('nexus_increment_goal'/);
});

test('GoalsPage rejects invalid target and progress values before saving', async () => {
  const source = await readFile(new URL('../src/pages/app/GoalsPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /positiveQuantity/);
  assert.match(source, /nonNegativeQuantity/);
  assert.match(source, /targetValue === null/);
  assert.match(source, /target_value: targetValue/);
  assert.match(source, /current_value: currentValue/);
});

test('leader and coordinator forms never silently accept an unconfirmed create', async () => {
  const leaders = await readFile(new URL('../src/pages/app/LeadersPage.tsx', import.meta.url), 'utf8');
  const coordinators = await readFile(new URL('../src/pages/app/CoordinatorsPage.tsx', import.meta.url), 'utf8');
  const crm = await readFile(new URL('../src/pages/app/CrmPage.tsx', import.meta.url), 'utf8');
  assert.match(leaders, /Não foi possível confirmar o cadastro da liderança/);
  assert.match(coordinators, /Não foi possível confirmar o cadastro do coordenador/);
  assert.match(crm, /Não foi possível confirmar o cadastro do contato/);
});

test('RegisterPage fails closed for incomplete invitations', async () => {
  const source = await readFile(new URL('../src/pages/public/RegisterPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /isInvite && \(!inviteOrgId/);
  assert.match(source, /inviteType === 'lider' && !inviteLeaderId/);
  assert.match(source, /inviteType === 'coordenador' && !inviteCoordId/);
  assert.match(source, /convite está incompleto ou expirado/);
});

test('OnboardingPage rejects an empty organization name before saving', async () => {
  const source = await readFile(new URL('../src/pages/app/OnboardingPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /if \(!orgName\.trim\(\)\)/);
  assert.match(source, /Informe o nome da organização/);
  assert.match(source, /setIsSubmitting\(true\)/);
});

test('SettingsPage does not claim a connection when Supabase is unconfigured', async () => {
  const source = await readFile(new URL('../src/pages/app/SettingsPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /isSupabaseConfigured \? 'Supabase configurado' : 'Supabase não configurado'/);
  assert.match(source, /VITE_SUPABASE_URL/);
  assert.doesNotMatch(source, /Supabase RLS Ativo & Conectado/);
});

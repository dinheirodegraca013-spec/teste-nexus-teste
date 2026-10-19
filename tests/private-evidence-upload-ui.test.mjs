import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const upload = readFileSync('src/components/ui/FileUpload.tsx', 'utf8');
const storage = readFileSync('src/services/privateEvidenceStorage.ts', 'utf8');
const field = readFileSync('src/pages/app/FieldPage.tsx', 'utf8');
const presence = readFileSync('src/pages/app/PresencePage.tsx', 'utf8');
const stickers = readFileSync('src/pages/app/StickersPage.tsx', 'utf8');

test('upload operacional usa callbacks compatíveis e deixa de ficar desabilitado para administradores', () => {
  assert.match(upload, /onFileSelected\?:/);
  assert.match(upload, /onFileRemoved\?:/);
  assert.match(field, /disabled=\{!\['admin', 'superadmin'\]\.includes\(profile\?\.role \|\| ''\)\}/);
  assert.match(presence, /disabled=\{!\['admin', 'superadmin'\]\.includes\(profile\?\.role \|\| ''\)\}/);
  assert.match(stickers, /disabled=\{!\['admin', 'superadmin'\]\.includes\(profile\?\.role \|\| ''\)\}/);
});

test('evidência nunca é gravada como base64: a tela envia data URL ao Storage privado antes do CRUD', () => {
  assert.match(storage, /uploadPrivateEvidenceDataUrl/);
  assert.match(field, /uploadPrivateEvidenceDataUrl\(orgId, 'cars'/);
  assert.match(field, /uploadPrivateEvidenceDataUrl\(orgId, 'houses'/);
  assert.match(field, /uploadPrivateEvidenceDataUrl\(orgId, 'presences'/);
  assert.match(presence, /uploadPrivateEvidenceDataUrl\(orgId, 'presences'/);
  assert.match(stickers, /uploadPrivateEvidenceDataUrl\(orgId, 'cars'/);
  assert.match(stickers, /uploadPrivateEvidenceDataUrl\(orgId, 'houses'/);
});

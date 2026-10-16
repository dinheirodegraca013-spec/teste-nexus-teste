import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const artifact = await build({
  stdin: {
    contents: "export { validatePhotoReference } from './src/services/photoEvidenceGuard'; export { presenceService, stickersService } from './src/services/dataServices';",
    resolveDir: process.cwd(),
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{
    name: 'mock-db',
    setup(bundle) {
      bundle.onResolve({ filter: /(?:\.\.\/lib\/supabase)$/ }, args => ({
        path: args.path, namespace: 'mock',
      }));
      bundle.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
        contents: `
          export const supabase = {
            from: (...args) => {
              globalThis.__photoTests.calls.push(args);
              throw Error('Database operation was not expected');
            }
          };
        `,
      }));
    },
  }],
});
const { validatePhotoReference, presenceService, stickersService } = await import(
  `data:text/javascript;base64,${Buffer.from(artifact.outputFiles[0].text).toString('base64')}`
);
const org = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
const dataUrl = 'data:image/jpeg;base64,' + 'a'.repeat(160);
const payload = { organization_id: org, photo_url: dataUrl };

test('rejects base64 photo evidence', () => {
  assert.equal(validatePhotoReference(payload).code, 'PRIVATE_PHOTO_STORAGE_REQUIRED');
});
test('rejects external image URLs and browser blob references', () => {
  for (const url of ['https://example.invalid/image.jpg', 'blob:https://example.invalid/test']) {
    assert.equal(validatePhotoReference({ organization_id: org, photo_url: url }).code, 'PRIVATE_PHOTO_STORAGE_REQUIRED');
  }
});
test('rejects path traversal and references owned by another tenant', () => {
  for (const url of [other + '/evidence.jpg', org + '/../x.jpg', org + '//file.jpg']) {
    assert.equal(validatePhotoReference({ organization_id: org, photo_url: url }).code, 'PRIVATE_PHOTO_STORAGE_REQUIRED');
  }
});
test('accepts empty photos and tenant-scoped private object keys only', () => {
  assert.equal(validatePhotoReference({ organization_id: org, photo_url: '' }), null);
  assert.equal(validatePhotoReference({ organization_id: org }), null);
  assert.equal(validatePhotoReference({ organization_id: org, photo_url: org + '/presence/check-1.webp' }), null);
});

for (const [title, action] of [
  ['presence create', () => presenceService.create(payload)],
  ['presence update', () => presenceService.update(org, payload)],
  ['vehicle create', () => stickersService.createCarSticker(payload)],
  ['vehicle update', () => stickersService.updateCarSticker(org, payload)],
  ['house create', () => stickersService.createHouseSticker(payload)],
  ['house update', () => stickersService.updateHouseSticker(org, payload)],
]) {
  test(`${title} refuses embedded photos before reaching the database`, async () => {
    globalThis.__photoTests = { calls: [] };
    const result = await action();
    assert.equal(result.error.code, 'PRIVATE_PHOTO_STORAGE_REQUIRED');
    assert.deepEqual(globalThis.__photoTests.calls, []);
  });
}

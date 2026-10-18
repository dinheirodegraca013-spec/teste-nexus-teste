import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: { contents: "export { EventsPage } from './src/pages/app/EventsPage'; export { callbacks, states } from 'react';", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'transform',
  plugins: [{ name: 'isolated-events', setup(builder) {
    builder.onResolve({ filter: /^(react(?:\/jsx-runtime)?|lucide-react|\.\.\/\.\.\/contexts\/AuthContext|\.\.\/\.\.\/contexts\/ToastContext|\.\.\/\.\.\/services|\.\.\/\.\.\/components\/ui\/.*)$/ }, args => ({ path: args.path, namespace: 'mock' }));
    builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => {
      if (args.path === 'react/jsx-runtime') return { contents: 'export const jsx=(type,props)=>({type,props}), jsxs=jsx;' };
      if (args.path === 'react') return { contents: `export const callbacks=[], states=[]; export const useState=v=>{const i=states.length; const value=globalThis.eventInitial?.[i] ?? v; states.push(value);return [value,n=>{states[i]=n}];}; export const useRef=v=>{if(!globalThis.eventRefs)return {current:v}; const i=globalThis.eventRefIndex++;return globalThis.eventRefs[i] ??= {current:v};}; export const useEffect=()=>{}, useLayoutEffect=f=>f(); export const useCallback=f=>{callbacks.push(f);return f}; export default { createElement:()=>null };` };
      if (args.path === 'lucide-react') return { contents: 'export const Calendar=0, Plus=0, MapPin=0, Clock=0, Users=0, Edit2=0, Trash2=0, CheckCircle2=0, Loader2=0;' };
      if (args.path.endsWith('/AuthContext')) return { contents: 'export const useAuth=()=>({organization:{id:globalThis.eventOrg ?? "org"}});' };
      if (args.path.endsWith('/ToastContext')) return { contents: 'export const useToast=()=>({success:m=>globalThis.eventSuccess?.push(m),error:m=>globalThis.eventErrors.push(m)});' };
      if (args.path.endsWith('/services')) return { contents: 'export const eventsService={getAll:async(org)=>typeof globalThis.eventResult === "function" ? globalThis.eventResult(org) : globalThis.eventResult,create:async(...args)=>globalThis.eventCreate(...args)};' };
      const name = args.path.split('/').pop();
      return { contents: name === 'Table' ? 'export const Table=0, TableHeader=0, TableBody=0, TableRow=0, TableHead=0, TableCell=0;' : `export const ${name}=0;` };
    });
  } }],
});

const { EventsPage, callbacks, states } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

test('a new organization never renders the previous organization events', () => {
  callbacks.length = 0; states.length = 0;
  globalThis.eventOrg = 'other-org';
  globalThis.eventInitial = [[{ id: 'old', title: 'Evento antigo', location: 'Local', event_type: 'Plenária' }], false, false];
  const page = EventsPage();
  delete globalThis.eventInitial;
  delete globalThis.eventOrg;
  assert.doesNotMatch(JSON.stringify(page), /Evento antigo/);
});

test('the previous organization edit dialog is closed during an organization change', () => {
  callbacks.length = 0; states.length = 0;
  globalThis.eventOrg = 'other-org';
  globalThis.eventInitial = [[], false, false, false, '', 'all', true, { id: 'old' }];
  const page = EventsPage();
  delete globalThis.eventInitial;
  delete globalThis.eventOrg;
  const findModal = node => {
    if (!node || typeof node !== 'object') return undefined;
    if ('isOpen' in (node.props || {})) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const found = findModal(child);
      if (found) return found;
    }
  };
  assert.equal(findModal(page)?.props.isOpen, false);
});

test('event loading reports a returned database error', async () => {
  globalThis.eventResult = { data: [], error: { message: 'falha de teste' } };
  globalThis.eventErrors = [];
  callbacks.length = 0;
  EventsPage();
  await callbacks[0]();
  assert.match(globalThis.eventErrors[0] || '', /falha de teste/);
});

test('missing organization stops loading and does not query events', async () => {
  callbacks.length = 0; states.length = 0;
  globalThis.eventOrg = '';
  globalThis.eventResult = () => { throw new Error('unexpected query'); };
  EventsPage();
  await callbacks[0]();
  delete globalThis.eventOrg;
  assert.deepEqual(states[0], []);
  assert.equal(states[1], false);
  assert.equal(states[2], true);
});

test('successful event loading stores the returned events', async () => {
  callbacks.length = 0; states.length = 0;
  globalThis.eventResult = { data: [{ id: 'event-1' }], error: null };
  EventsPage();
  await callbacks[0]();
  assert.equal(states[0][0].id, 'event-1');
  assert.equal(states[1], false);
  assert.equal(states[2], false);
});

test('older event response cannot overwrite a later refresh', async () => {
  let resolveOld;
  const old = new Promise(resolve => { resolveOld = resolve; });
  let calls = 0;
  globalThis.eventResult = () => ++calls === 1 ? old : Promise.resolve({ data: [{ id: 'new' }], error: null });
  globalThis.eventErrors = [];
  callbacks.length = 0; states.length = 0;
  EventsPage();
  const first = callbacks[0]();
  await callbacks[0]();
  resolveOld({ data: [{ id: 'old' }], error: null });
  await first;
  assert.equal(states[0][0].id, 'new');
});

test('a late refresh from the previous organization cannot replace the current organization response', async () => {
  let resolveCurrent;
  globalThis.eventRefs = [];
  globalThis.eventRefIndex = 0;
  globalThis.eventOrg = 'org-a';
  globalThis.eventErrors = [];
  globalThis.eventResult = org => org === 'org-b'
    ? new Promise(resolve => { resolveCurrent = resolve; })
    : Promise.resolve({ data: [{ id: 'old' }], error: null });
  callbacks.length = 0; states.length = 0;
  EventsPage();
  const refreshOld = callbacks[0];
  callbacks.length = 0; states.length = 0;
  globalThis.eventOrg = 'org-b';
  globalThis.eventRefIndex = 0;
  EventsPage();
  const current = callbacks[0]();
  await refreshOld();
  resolveCurrent({ data: [{ id: 'current' }], error: null });
  await current;
  assert.equal(states[0][0].id, 'current');
  delete globalThis.eventRefs;
  delete globalThis.eventRefIndex;
  delete globalThis.eventOrg;
});

test('an old organization error is ignored immediately after the organization changes', async () => {
  let rejectOld;
  globalThis.eventRefs = [];
  globalThis.eventRefIndex = 0;
  globalThis.eventOrg = 'org-a';
  globalThis.eventErrors = [];
  globalThis.eventResult = () => new Promise((_, reject) => { rejectOld = reject; });
  callbacks.length = 0; states.length = 0;
  EventsPage();
  const oldRequest = callbacks[0]();
  callbacks.length = 0; states.length = 0;
  globalThis.eventOrg = 'org-b';
  globalThis.eventRefIndex = 0;
  EventsPage();
  rejectOld(new Error('old organization error'));
  await oldRequest;
  assert.deepEqual(globalThis.eventErrors, []);
  assert.equal(states[2], false);
  delete globalThis.eventRefs;
  delete globalThis.eventRefIndex;
  delete globalThis.eventOrg;
});

for (const returnToOriginal of [false, true]) test(`a pending save cannot show success after organization change${returnToOriginal ? ' and return' : ''}`, async () => {
  let resolveSave;
  globalThis.eventRefs = [{ current: 0 }, { current: 'org-a' }, { current: 'org-a' }, { current: 'org-a' }];
  globalThis.eventRefIndex = 0;
  globalThis.eventOrg = 'org-a';
  globalThis.eventErrors = [];
  globalThis.eventSuccess = [];
  globalThis.eventCreate = () => new Promise(resolve => { resolveSave = resolve; });
  globalThis.eventResult = { data: [], error: null };
  globalThis.eventInitial = [[], false, false, false, '', 'all', true, null, {
    title: 'Evento', location: 'Local', description: '', territory: '', event_type: 'Plenária',
    date: '2026-10-17', time: '19:00', expected_attendees: 1, confirmed_attendees: 0, status: 'scheduled'
  }];
  callbacks.length = 0; states.length = 0;
  const page = EventsPage();
  const findForm = node => {
    if (!node || typeof node !== 'object') return undefined;
    if (node.type === 'form') return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const found = findForm(child);
      if (found) return found;
    }
  };
  const save = findForm(page).props.onSubmit({ preventDefault() {} });
  globalThis.eventOrg = 'org-b';
  globalThis.eventRefIndex = 0;
  callbacks.length = 0; states.length = 0;
  EventsPage();
  if (returnToOriginal) {
    globalThis.eventOrg = 'org-a';
    globalThis.eventRefIndex = 0;
    callbacks.length = 0; states.length = 0;
    EventsPage();
  }
  resolveSave({ data: { id: 'event-a' }, error: null });
  await save;
  assert.deepEqual(globalThis.eventSuccess, []);
  delete globalThis.eventRefs;
  delete globalThis.eventRefIndex;
  delete globalThis.eventOrg;
  delete globalThis.eventInitial;
  delete globalThis.eventSuccess;
  delete globalThis.eventCreate;
});

test('an old save cannot clear the submitting state of a new organization save', async () => {
  const pending = [];
  globalThis.eventRefs = [{ current: 0 }, { current: 'org-a' }, { current: 'org-a' }, { current: 'org-a' }];
  globalThis.eventRefIndex = 0;
  globalThis.eventOrg = 'org-a';
  globalThis.eventErrors = [];
  globalThis.eventSuccess = [];
  globalThis.eventCreate = () => new Promise(resolve => pending.push(resolve));
  globalThis.eventInitial = [[], false, false, false, '', 'all', true, null, {
    title: 'Evento', location: 'Local', description: '', territory: '', event_type: 'Plenária',
    date: '2026-10-17', time: '19:00', expected_attendees: 1, confirmed_attendees: 0, status: 'scheduled'
  }];
  const findForm = node => {
    if (!node || typeof node !== 'object') return undefined;
    if (node.type === 'form') return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const found = findForm(child);
      if (found) return found;
    }
  };
  callbacks.length = 0; states.length = 0;
  const oldSave = findForm(EventsPage()).props.onSubmit({ preventDefault() {} });
  globalThis.eventOrg = 'org-b';
  globalThis.eventRefIndex = 0;
  globalThis.eventRefs[3].current = 'org-b';
  callbacks.length = 0; states.length = 0;
  const newSave = findForm(EventsPage()).props.onSubmit({ preventDefault() {} });
  pending[0]({ data: { id: 'event-a' }, error: null });
  await oldSave;
  assert.equal(states[3], true);
  pending[1]({ data: null, error: { message: 'test' } });
  await newSave;
  delete globalThis.eventRefs;
  delete globalThis.eventRefIndex;
  delete globalThis.eventOrg;
  delete globalThis.eventInitial;
  delete globalThis.eventSuccess;
  delete globalThis.eventCreate;
});

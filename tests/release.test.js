import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, copyFileSync, readFileSync, existsSync, rmSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const script = new URL('../scripts/release.py', import.meta.url);
const license = readFileSync(new URL('../LICENSE', import.meta.url), 'utf8');
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'following-release-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  for (const dir of ['scripts', 'src', 'icons']) mkdirSync(join(root, dir));
  copyFileSync(script, join(root, 'scripts/release.py'));
  writeFileSync(join(root, 'manifest.json'), JSON.stringify({manifest_version: 3, name: 'Example', version: '0.1.0', background: {service_worker: 'src/background.js', type: 'module'}, options_page: 'options.html', icons: {'128': 'icons/icon128.png'}}));
  writeFileSync(join(root, 'src/background.js'), "import {TWITCH_CLIENT_ID} from './config.js';\n");
  writeFileSync(join(root, 'src/config.js'), "export const TWITCH_CLIENT_ID = '';\n");
  for (const file of ['options.html', 'help.html', 'privacy.html']) writeFileSync(join(root, file), '<link rel="stylesheet" href="public.css"><script type="module" src="src/background.js"></script>');
  writeFileSync(join(root, 'public.css'), 'body{color:purple}');
  copyFileSync(new URL('../icons/icon128.png', import.meta.url), join(root, 'icons/icon128.png'));
  writeFileSync(join(root, 'LICENSE'), license);
  writeFileSync(join(root, 'PRIVATE.txt'), 'must not ship');
  return {root, run: (...args) => spawnSync('python3', [join(root, 'scripts/release.py'), ...args], {encoding: 'utf8'})};
}
function unzip(path) {
  const result = spawnSync('python3', ['-c', 'import zipfile,json,sys; z=zipfile.ZipFile(sys.argv[1]); print(json.dumps({n:z.read(n).decode() for n in z.namelist() if not n.endswith(".png")}))', path], {encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
test('release package roundtrip is allowlisted, deterministic, and leaves source config unchanged', t => {
  const {root, run} = fixture(t);
  const source = readFileSync(join(root, 'src/config.js'), 'utf8');
  const draft = join(root, 'artifacts/twitch-following-0.1.0-draft.zip');
  let result = run('package', '--plain');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /DRAFT/);
  const first = readFileSync(draft);
  assert.equal(run('package', '--plain').status, 0);
  assert.deepEqual(readFileSync(draft), first);
  const files = unzip(draft);
  assert.equal(files['src/config.js'], source);
  assert.equal(files.LICENSE, license);
  assert.match(files.LICENSE, /MIT License[\s\S]*Copyright \(c\) 2026 Kevin Mok[\s\S]*Permission is hereby granted[\s\S]*THE SOFTWARE IS PROVIDED/);
  assert.equal(files['PRIVATE.txt'], undefined);
  assert.equal(files['scripts/release.py'], undefined);
  result = run('package', '--client-id', 'publicClient123', '--plain');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /CONFIGURED/);
  const ready = join(root, 'artifacts/twitch-following-0.1.0.zip');
  assert.equal(unzip(ready)['src/config.js'], "export const TWITCH_CLIENT_ID = 'publicClient123';\n");
  assert.equal(readFileSync(join(root, 'src/config.js'), 'utf8'), source);
  result = run('inspect', ready, '--plain');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /SHA256/);
});
test('release rejects missing dependencies, invalid IDs, and unsafe output paths', t => {
  const {root, run} = fixture(t);
  assert.notEqual(run('package', '--client-id', '../secret').status, 0);
  for (const out of ['manifest.json', 'src/config.zip', 'artifacts/wrong.txt']) {
    assert.notEqual(run('package', '--out', join(root, out)).status, 0);
  }
  writeFileSync(join(root, 'src/background.js'), "import './missing.js';");
  const result = run('package');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing.js/);
  assert.equal(existsSync(join(root, 'artifacts/twitch-following-0.1.0-draft.zip')), false);
});
test('inspection rejects traversal, duplicate files, symlinks, and unapproved archive entries', t => {
  const {root, run} = fixture(t);
  for (const kind of ['traversal', 'duplicate', 'symlink', 'unapproved']) {
    const archive = join(root, `${kind}.zip`);
    const result = spawnSync('python3', ['-c', `import zipfile,sys\nz=zipfile.ZipFile(sys.argv[1],'w')\nk=sys.argv[2]\nif k=='duplicate':\n z.writestr('manifest.json','{}'); z.writestr('manifest.json','{}')\nelif k=='symlink':\n i=zipfile.ZipInfo('src/link.js'); i.external_attr=0o120777<<16; z.writestr(i,'target')\nelse: z.writestr('../leak' if k=='traversal' else 'PRIVATE.txt','secret')\nz.close()`, archive, kind], {encoding: 'utf8'});
    assert.equal(result.status, 0);
    assert.notEqual(run('inspect', archive).status, 0, kind);
  }
});

test('inspection validates manifest and nested HTML/CSS dependencies', t => {
  const {root, run} = fixture(t);
  writeFileSync(join(root, 'public.css'), 'body{background:url("missing.png")}');
  assert.match(run('package').stderr, /missing.png/);
  writeFileSync(join(root, 'public.css'), 'body{}');
  writeFileSync(join(root, 'help.html'), '<script src="https://example.test/script.js"></script>');
  assert.match(run('package').stderr, /remote code/);
  writeFileSync(join(root, 'help.html'), '<a href="https://example.test/">Help</a>');
  const manifest = JSON.parse(readFileSync(join(root, 'manifest.json')));
  manifest.background.service_worker = 'https://example.test/script.js';
  writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest));
  assert.notEqual(run('package').status, 0);
});

test('packaging refuses an artifacts symlink pointing into source', t => {
  const {root, run} = fixture(t);
  symlinkSync(join(root, 'src'), join(root, 'artifacts'));
  const result = run('package');
  assert.notEqual(result.status, 0);
  assert.equal(existsSync(join(root, 'src/twitch-following-0.1.0-draft.zip')), false);
});

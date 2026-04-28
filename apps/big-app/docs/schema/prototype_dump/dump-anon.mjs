#!/usr/bin/env node
// dump-anon.mjs — programmatic Supabase dump using only the public anon key.
//
// No DB password required. Works against any Supabase project where the tables
// you care about are reachable through PostgREST with the anon role (i.e. either
// RLS allows anon SELECT, or RLS is off / permissive). For tables the anon role
// cannot read, you'll get a "blocked" entry in tables_inventory.md — that is
// expected, not a bug.
//
// Why we don't use the OpenAPI root: Supabase's `/rest/v1/` introspection
// endpoint requires the service_role key. With anon we have to discover table
// names from another source. We use TWO sources and union them:
//   - CREATE TABLE / ALTER TABLE statements in `schema_history.sql` (the
//     concatenated migration history)
//   - `.from('table_name')` calls in `src/**/*.{js,jsx,ts,tsx}` (catches
//     tables created later via Studio UI without a migration)
//
// What it does:
//   1. Builds the candidate table list from both sources above.
//   2. For each table:
//        a. HEAD /rest/v1/<table> with Prefer: count=exact → row count + access.
//        b. If readable, paginates GET /rest/v1/<table>?select=* via Range
//           headers and writes data/<table>.json (FULL row dump).
//   3. Writes tables_inventory.md (row counts + access status per table).
//
// Usage:
//   node docs/schema/prototype_dump/dump-anon.mjs
//
// Reads SUPABASE_URL and SUPABASE_ANON_KEY from env, falling back to
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in `.env.local` at the repo root.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const PAGE_SIZE = 1000;

function loadEnv() {
  let url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  let key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    const envPath = join(REPO_ROOT, '.env.local');
    if (existsSync(envPath)) {
      const text = readFileSync(envPath, 'utf8');
      for (const line of text.split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const [, k, raw] = m;
        const v = raw.replace(/^['"]|['"]$/g, '').trim();
        if (!url && (k === 'SUPABASE_URL' || k === 'VITE_SUPABASE_URL')) url = v;
        if (!key && (k === 'SUPABASE_ANON_KEY' || k === 'VITE_SUPABASE_ANON_KEY')) key = v;
      }
    }
  }
  if (!url || !key) {
    console.error('ERROR: SUPABASE_URL / SUPABASE_ANON_KEY not found in env or .env.local');
    process.exit(1);
  }
  return { url: url.replace(/\/+$/, ''), key };
}

const { url: SUPABASE_URL, key: ANON_KEY } = loadEnv();
const REST = `${SUPABASE_URL}/rest/v1`;
const HEADERS = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` };

function parseTableNamesFromSql(sql) {
  // Pick up CREATE TABLE and ALTER TABLE — some tables (e.g. positions,
  // role_permissions) were created via Studio UI and only show up in ALTERs.
  const names = new Set();
  const createRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)\s*\(/gi;
  const alterRe = /alter\s+table\s+(?:only\s+)?(?:if\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi;
  let m;
  while ((m = createRe.exec(sql)) !== null) names.add(m[1]);
  while ((m = alterRe.exec(sql)) !== null) names.add(m[1]);
  return names;
}

const SRC_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '.next', 'coverage']);

function* walkSrc(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
    const full = join(dir, name);
    let s;
    try { s = statSync(full); } catch { continue; }
    if (s.isDirectory()) yield* walkSrc(full);
    else if (s.isFile() && SRC_EXT.has(full.slice(full.lastIndexOf('.')))) yield full;
  }
}

function parseTableNamesFromSrc(srcRoot) {
  const names = new Set();
  if (!existsSync(srcRoot)) return names;
  // Match `.from('table')` or `.from("table")`. Skip the optional schema.from
  // form (`from('schema.table')`) since PostgREST exposes only public anyway.
  const re = /\.from\(\s*['"]([a-z_][a-z0-9_]*)['"]\s*\)/g;
  for (const file of walkSrc(srcRoot)) {
    let text;
    try { text = readFileSync(file, 'utf8'); } catch { continue; }
    let m;
    while ((m = re.exec(text)) !== null) names.add(m[1]);
  }
  return names;
}

async function probeTable(table) {
  const res = await fetch(`${REST}/${table}?select=*`, {
    method: 'HEAD',
    headers: { ...HEADERS, Prefer: 'count=exact', Range: '0-0' },
  });
  if (!res.ok) {
    return { ok: false, status: res.status, count: 0 };
  }
  const cr = res.headers.get('content-range') || '';
  const m = cr.match(/\/(\d+|\*)$/);
  const count = m && m[1] !== '*' ? parseInt(m[1], 10) : 0;
  return { ok: true, status: res.status, count };
}

async function fetchAllRows(table, total) {
  const rows = [];
  const upper = Math.max(total, 1);
  for (let from = 0; from < upper; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const res = await fetch(`${REST}/${table}?select=*`, {
      headers: { ...HEADERS, Range: `${from}-${to}`, 'Range-Unit': 'items' },
    });
    if (!res.ok) {
      if (rows.length === 0) return [];
      throw new Error(`fetch ${table} ${from}-${to} → ${res.status}`);
    }
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

function renderInventory(results) {
  const lines = [
    '# Tables inventory',
    '',
    'Generated by `dump-anon.mjs`. Row counts and access status reflect what the',
    'public anon role can see via PostgREST. "blocked" means RLS or grants prevent',
    'anon SELECT. "missing" means the table name was in the migration history but',
    "PostgREST returned PGRST205 (the table doesn't exist in the live DB anymore).",
    '',
    '| Table | Status | Rows | HTTP |',
    '|-------|--------|------|------|',
  ];
  for (const r of results) {
    let status;
    if (r.ok) status = 'ok';
    else if (r.status === 404 || r.status === 400) status = 'missing';
    else if (r.status === 401 || r.status === 403) status = 'blocked';
    else status = 'error';
    lines.push(`| ${r.table} | ${status} | ${r.count} | ${r.status} |`);
  }
  return lines.join('\n') + '\n';
}

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

(async function main() {
  console.log(`Supabase: ${SUPABASE_URL}`);

  const sqlPath = join(HERE, 'schema_history.sql');
  const sqlNames = existsSync(sqlPath)
    ? parseTableNamesFromSql(readFileSync(sqlPath, 'utf8'))
    : new Set();

  const srcRoot = join(REPO_ROOT, 'src');
  const srcNames = parseTableNamesFromSrc(srcRoot);

  const all = new Set([...sqlNames, ...srcNames]);
  const tables = [...all].sort();

  const onlySrc = [...srcNames].filter((n) => !sqlNames.has(n));
  console.log(`Candidates: ${tables.length} total · ${sqlNames.size} from schema_history.sql · ${srcNames.size} from src/`);
  if (onlySrc.length) console.log(`  src-only (not in migrations): ${onlySrc.sort().join(', ')}`);
  if (!tables.length) {
    console.error('ERROR: no candidate tables found — schema_history.sql and src/ both missing.');
    process.exit(1);
  }

  const dataDir = join(HERE, 'data');
  ensureDir(dataDir);

  const results = [];
  for (const table of tables) {
    process.stdout.write(`  ${table.padEnd(28)} `);
    const probe = await probeTable(table);
    if (!probe.ok) {
      console.log(`× ${probe.status}`);
      results.push({ table, ok: false, status: probe.status, count: 0 });
      continue;
    }
    let rows = [];
    try {
      rows = await fetchAllRows(table, probe.count);
    } catch (e) {
      console.log(`× ${e.message}`);
      results.push({ table, ok: false, status: 0, count: probe.count });
      continue;
    }
    writeFileSync(join(dataDir, `${table}.json`), JSON.stringify(rows, null, 2) + '\n');
    console.log(`✓ ${rows.length} rows`);
    results.push({ table, ok: true, status: 200, count: rows.length });
  }

  writeFileSync(join(HERE, 'tables_inventory.md'), renderInventory(results));

  const okCount = results.filter((r) => r.ok).length;
  const blockedCount = results.filter((r) => !r.ok && (r.status === 401 || r.status === 403)).length;
  const missingCount = results.filter((r) => !r.ok && (r.status === 404 || r.status === 400)).length;
  console.log('');
  console.log(`Done. ${okCount} ok · ${blockedCount} blocked · ${missingCount} missing · ${results.length - okCount - blockedCount - missingCount} other`);
  console.log('Wrote:');
  console.log('  tables_inventory.md');
  console.log(`  data/*.json   (full row dumps for ${okCount} tables)`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

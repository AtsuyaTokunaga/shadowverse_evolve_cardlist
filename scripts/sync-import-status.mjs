import { readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const TARGETS_PATH = path.resolve('config/expansion-targets.json');
const RAW_DIRECTORY = path.resolve('data/raw');
const SEEDS_DIRECTORY = path.resolve('db/seeds');
const OUTPUT_PATH = path.resolve('docs/database/import-status.md');

function markdownCell(value) {
  return String(value).replaceAll('|', '\\|');
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function rawStatus(code) {
  const directory = path.join(RAW_DIRECTORY, code);
  if (!existsSync(directory)) return { label: '未実行', count: null };

  const files = await readdir(directory);
  const count = files.filter((file) => file.endsWith('.html')).length;
  const manifestPath = path.join(directory, 'manifest.json');
  if (!existsSync(manifestPath)) return { label: `途中 (${count}件)`, count };

  const manifest = await readJson(manifestPath);
  const expected = manifest.expected_count;
  const failures = manifest.failures?.length ?? 0;
  if (expected !== null && expected !== undefined && count === expected && failures === 0) {
    return { label: `完了 (${count}件)`, count };
  }
  const expectedLabel = expected === null || expected === undefined ? '?' : expected;
  const failureLabel = failures > 0 ? `、失敗${failures}件` : '';
  return { label: `途中 (${count}/${expectedLabel}件${failureLabel})`, count };
}

async function seedStatuses(codes) {
  if (!existsSync(SEEDS_DIRECTORY)) return new Map();
  const files = (await readdir(SEEDS_DIRECTORY)).filter((file) => file.endsWith('.sql'));
  const statuses = new Map();

  for (const file of files) {
    const contents = await readFile(path.join(SEEDS_DIRECTORY, file), 'utf8');
    const source = contents.match(/^-- Generated from data\/raw\/([^/]+)\/\*\.html\./m)?.[1];
    const count = contents.match(/^-- Cards: (\d+)$/m)?.[1];
    if (source && codes.has(source)) statuses.set(source, { file, count: Number(count) });
  }
  return statuses;
}

async function main() {
  const catalog = await readJson(TARGETS_PATH);
  const groups = catalog.groups;
  const codes = new Set(groups.flatMap((group) => group.codes));
  const seeds = await seedStatuses(codes);
  const lines = [
    '# カードデータ取込状況',
    '',
    '対象コードは `config/expansion-targets.json` で管理します。このファイルは `npm run sync:import-status` で、ローカルの `data/raw/<コード>/manifest.json` と `db/seeds/*.sql` から更新します。',
    '',
    '| 区分 | コード | DOM取得 | seed SQL |',
    '|---|---|---|---|',
  ];

  for (const group of groups) {
    for (const code of group.codes) {
      const raw = await rawStatus(code);
      const seed = seeds.get(code);
      const seedLabel = seed ? `生成済み (${seed.count}件, \`${seed.file}\`)` : '未生成';
      lines.push(`| ${markdownCell(group.prefix)} | ${markdownCell(code)} | ${markdownCell(raw.label)} | ${markdownCell(seedLabel)} |`);
    }
  }

  lines.push('', 'DOM取得の「完了」は、マニフェストの想定件数と保存済みHTML件数が一致し、取得失敗が0件であることを示します。', '');
  await writeFile(OUTPUT_PATH, lines.join('\n'), 'utf8');
  console.log(`Updated ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(`Failed to sync import status: ${error.message}`);
  process.exitCode = 1;
});

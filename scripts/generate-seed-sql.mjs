import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { load } from 'cheerio';

const SITE_ORIGIN = 'https://shadowverse-evolve.com';
const CLASS_CODES = new Map([['ニュートラル', 'neutral'], ['エルフ', 'elf'], ['ロイヤル', 'royal'], ['ウィッチ', 'witch'], ['ナイトメア', 'nightmare'], ['ドラゴン', 'dragon'], ['ビショップ', 'bishop']]);
const CARD_KIND_CODES = new Map([['フォロワー', 'follower'], ['エボルヴ', 'evolve'], ['アドバンス', 'advance'], ['スペル', 'spell'], ['アミュレット', 'amulet'], ['トークン', 'token'], ['リーダー', 'leader'], ['EP', 'ep'], ['SEP', 'sep']]);
const RARITY_SORT_ORDERS = new Map([['LG', 10], ['GR', 20], ['SR', 30], ['BR', 40], ['UR', 50], ['SL', 60], ['SP', 70], ['SSP', 80], ['プレミアム', 90]]);
const KEYWORD_NAMES = new Set([
  'アドバンス起動', '威圧', 'オーラ', '覚醒', 'クイック', 'コンボ', '指定攻撃', '守護',
  'スペルチェイン', 'スタック', '進化', '進化時', '超進化時', '出走時', '食事', '疾走',
  'シングルドライブ', '真紅', 'ステルス', '土の秘術', 'ツインドライブ', '突進', 'ドレイン',
  'ネクロチャージ', 'ファンファーレ', '必殺', '憑依', 'UB', 'ラストワード', 'レッスン', '起動', '攻撃時',
]);

function usage() { console.log('Usage: npm run generate:seed -- --expansion SD02 --output db/seeds/002__sd02_cards.sql'); }
function parseArgs(argv) {
  const options = { input: 'data/raw' };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') options.help = true;
    else if (['--expansion', '--input', '--output'].includes(argument)) {
      const value = argv[++index];
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value.`);
      options[argument.slice(2)] = value;
    } else throw new Error(`Unknown option: ${argument}`);
  }
  return options;
}
function text(value) { return String(value ?? '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim(); }
function nullable(value) { const result = text(value); return result === '' || result === '-' || result === '－' ? null : result; }
function integer(value) { const result = nullable(value); if (result === null) return null; if (!/^\d+$/.test(result)) throw new Error(`Expected a non-negative integer, got: ${result}`); return Number(result); }
function split(value) { const result = nullable(value); return result === null ? [] : result.split('・').map((item) => item.trim()).filter(Boolean); }
function string(value) { return value === null || value === undefined ? 'NULL' : `'${String(value).replace(/\\/g, '\\\\').replace(/\u0000/g, '\\0').replace(/\u001a/g, '\\Z').replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/'/g, "''")}'`; }
function number(value) { return value === null || value === undefined ? 'NULL' : String(value); }
function rows(values) { return values.map((row) => `  (${row.join(', ')})`).join(',\n'); }

function detailText($, detail) {
  const clone = $(detail).clone();
  clone.find('br').replaceWith('\n');
  clone.find('img').each((_, image) => $(image).replaceWith((nullable($(image).attr('alt')) ?? '') ? `【${nullable($(image).attr('alt'))}】` : ''));
  return nullable(clone.text());
}
function keywords($, detail) {
  const results = new Set();
  const addKeyword = (value) => {
    if (/^(スペルチェイン|コンボ|ネクロチャージ)_\d+$/.test(value) || /^SC_\d+$/.test(value)) results.add(value.startsWith('コンボ') ? 'コンボ' : value.startsWith('ネクロチャージ') ? 'ネクロチャージ' : 'スペルチェイン');
    else if (KEYWORD_NAMES.has(value)) results.add(value);
  };
  $(detail).find('img.icon-square[alt]').each((_, image) => {
    const value = nullable($(image).attr('alt'));
    if (value) addKeyword(value);
  });
  const contents = detailText($, detail);
  for (const match of contents?.matchAll(/【([^】]+)】/g) ?? []) addKeyword(match[1]);
  return [...results];
}
function cardFromHtml(html, fileName, expansion) {
  const $ = load(html);
  const root = $('.cardlist-Detail').first();
  if (!root.length) throw new Error(`${fileName}: card detail was not found.`);
  const fields = new Map();
  root.find('.info dl').each((_, definition) => fields.set(text($(definition).find('dt').text()), nullable($(definition).find('dd').text())));
  const statuses = new Map();
  root.find('.status .status-Item').each((_, item) => {
    const key = ($(item).attr('class') ?? '').match(/status-Item-(Cost|Power|Hp)/)?.[1];
    const clone = $(item).clone(); clone.find('.heading').remove();
    if (key) statuses.set(key, integer(clone.text()));
  });
  const cardNumber = path.basename(fileName, '.html');
  const className = fields.get('クラス');
  const kinds = split(fields.get('カード種類'));
  const rarities = split(fields.get('レアリティ'));
  if (!CLASS_CODES.has(className)) throw new Error(`${cardNumber}: unknown class ${className}`);
  if (!kinds.length || kinds.some((kind) => !CARD_KIND_CODES.has(kind))) throw new Error(`${cardNumber}: unknown card kind`);
  if (rarities.some((rarity) => !RARITY_SORT_ORDERS.has(rarity))) throw new Error(`${cardNumber}: unknown rarity ${rarities.join('・')}`);
  const detail = root.find('.detail').first();
  const productSection = $('.cardlist-Detail_Products').first();
  const productHref = productSection.find('a[href*="expansion="]').first().attr('href');
  const productCode = productHref ? new URL(productHref, SITE_ORIGIN).searchParams.get('expansion') : expansion;
  const image = root.find('.img.w100 img').first().attr('src');
  return {
    cardNumber, name: nullable(root.find('.txt .ttl').first().text()), className, kinds,
    types: split(fields.get('タイプ')), rarities, title: fields.get('タイトル') ?? null,
    cost: statuses.get('Cost') ?? null, power: statuses.get('Power') ?? null, defense: statuses.get('Hp') ?? null,
    abilityText: detail.length ? detailText($, detail) : null,
    flavorText: nullable(root.find('.speech').first().text()),
    illustratorName: nullable(root.find('.illustrator .heading').first().text()),
    imageUrl: image ? new URL(image, SITE_ORIGIN).toString() : null,
    keywords: detail.length ? keywords($, detail) : [],
    product: { code: productCode ?? expansion, name: fields.get('収録商品') ?? nullable(productSection.find('.ttl').first().text()), releaseDate: nullable(productSection.find('.date').first().text()) },
  };
}
function productType(name) { return name.includes('デッキ') ? 'deck' : name.includes('パック') ? 'booster_pack' : 'other'; }

function sql(expansion, cards) {
  const unique = (values) => [...new Set(values.filter(Boolean))].sort();
  const classNames = unique(cards.map((card) => card.className));
  const kinds = unique(cards.flatMap((card) => card.kinds));
  const rarities = unique(cards.flatMap((card) => card.rarities)).sort((a, b) => RARITY_SORT_ORDERS.get(a) - RARITY_SORT_ORDERS.get(b));
  const titles = unique(cards.map((card) => card.title));
  const types = unique(cards.flatMap((card) => card.types));
  const keywordNames = unique(cards.flatMap((card) => card.keywords));
  const products = [...new Map(cards.map((card) => [card.product.code, card.product])).values()];
  const output = [
    `-- Generated from data/raw/${expansion}/*.html. Do not edit by hand.`,
    `-- Cards: ${cards.length}`,
    '-- This file is UTF-8. Keep this before Japanese string literals when using mysql SOURCE.',
    'SET NAMES utf8mb4;',
    '',
    'START TRANSACTION;',
    '',
  ];
  const insertMaster = (table, columns, data, update) => { if (data.length) output.push(`INSERT INTO ${table} (${columns}) VALUES`, rows(data), `ON DUPLICATE KEY UPDATE ${update};`, ''); };
  insertMaster('card_classes', 'code, name', classNames.map((name) => [string(CLASS_CODES.get(name)), string(name)]), 'name = VALUES(name)');
  insertMaster('card_kinds', 'code, name', kinds.map((name) => [string(CARD_KIND_CODES.get(name)), string(name)]), 'name = VALUES(name)');
  insertMaster('rarities', 'code, name, sort_order', rarities.map((name) => [string(name), string(name), number(RARITY_SORT_ORDERS.get(name))]), 'name = VALUES(name), sort_order = VALUES(sort_order)');
  insertMaster('titles', 'name', titles.map((name) => [string(name)]), 'name = VALUES(name)');
  insertMaster('products', 'code, name, product_type, release_date', products.map((product) => [string(product.code), string(product.name), string(productType(product.name)), string(product.releaseDate)]), 'name = VALUES(name), product_type = VALUES(product_type), release_date = VALUES(release_date)');
  insertMaster('types', 'name', types.map((name) => [string(name)]), 'name = VALUES(name)');
  insertMaster('keyword_abilities', 'name', keywordNames.map((name) => [string(name)]), 'name = VALUES(name)');
  output.push('INSERT INTO cards (card_number, name, class_id, title_id, cost, power, defense, ability_text, flavor_text, illustrator_name, image_url) VALUES');
  output.push(rows(cards.map((card) => [string(card.cardNumber), string(card.name), `(SELECT id FROM card_classes WHERE code = ${string(CLASS_CODES.get(card.className))})`, card.title ? `(SELECT id FROM titles WHERE name = ${string(card.title)})` : 'NULL', number(card.cost), number(card.power), number(card.defense), string(card.abilityText), string(card.flavorText), string(card.illustratorName), string(card.imageUrl)])));
  output.push('ON DUPLICATE KEY UPDATE name = VALUES(name), class_id = VALUES(class_id), title_id = VALUES(title_id), cost = VALUES(cost), power = VALUES(power), defense = VALUES(defense), ability_text = VALUES(ability_text), flavor_text = VALUES(flavor_text), illustrator_name = VALUES(illustrator_name), image_url = VALUES(image_url);', '');
  const relations = (table, target, column, values, lookup = 'name') => { if (!values.length) return; output.push(`INSERT IGNORE INTO ${table} (card_id, ${column}) VALUES`, rows(values.map(([cardNumber, value]) => [`(SELECT id FROM cards WHERE card_number = ${string(cardNumber)})`, `(SELECT id FROM ${target} WHERE ${lookup} = ${string(value)})`])), ';', ''); };
  relations('card_card_kinds', 'card_kinds', 'card_kind_id', cards.flatMap((card) => card.kinds.map((kind) => [card.cardNumber, CARD_KIND_CODES.get(kind)])), 'code');
  relations('card_rarities', 'rarities', 'rarity_id', cards.flatMap((card) => card.rarities.map((rarity) => [card.cardNumber, rarity])), 'code');
  relations('card_products', 'products', 'product_id', cards.map((card) => [card.cardNumber, card.product.code]), 'code');
  relations('card_types', 'types', 'type_id', cards.flatMap((card) => card.types.map((type) => [card.cardNumber, type])));
  relations('card_keyword_abilities', 'keyword_abilities', 'keyword_ability_id', cards.flatMap((card) => card.keywords.map((keyword) => [card.cardNumber, keyword])));
  output.push('COMMIT;', '');
  return output.join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return usage();
  if (!options.expansion) throw new Error('--expansion is required.');
  const input = path.resolve(options.input, options.expansion);
  const output = path.resolve(options.output ?? path.join('db', 'seeds', `${options.expansion.toLowerCase()}_cards.sql`));
  const names = (await readdir(input)).filter((name) => name.endsWith('.html')).sort((a, b) => a.localeCompare(b, 'en'));
  if (!names.length) throw new Error(`No HTML files found in ${input}.`);
  const cards = await Promise.all(names.map(async (name) => cardFromHtml(await readFile(path.join(input, name), 'utf8'), name, options.expansion)));
  if (cards.some((card) => !card.name || !card.product.name)) throw new Error('A card name or product name is missing.');
  if (new Set(cards.map((card) => card.cardNumber)).size !== cards.length) throw new Error('Duplicate card number found.');
  await writeFile(output, sql(options.expansion, cards), 'utf8');
  console.log(`Generated ${output} (${cards.length} cards).`);
}
main().catch((error) => { console.error(`Failed to generate seed SQL: ${error.message}`); process.exitCode = 1; });

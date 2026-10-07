#!/usr/bin/env node

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const SITE_ORIGIN = "https://shadowverse-evolve.com";
const SEARCH_PATH = "/cardlist/cardsearch/";
const DEFAULT_OUTPUT_DIR = "data/raw";

function printUsage() {
  console.log(`Usage:
  npm run fetch:card-dom -- --expansion <code> [options]

Required:
  --expansion <code>    Product code to fetch, for example SD02

Options:
  --output <directory>  Parent directory for saved DOM files (default: data/raw)
  --delay-ms <number>   Delay between card pages in milliseconds (default: 1000)
  --overwrite           Fetch files that already exist
  --help                Show this help
`);
}

function parseArgs(argv) {
  const options = {
    output: DEFAULT_OUTPUT_DIR,
    delayMs: 1000,
    overwrite: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--help") {
      options.help = true;
      continue;
    }
    if (argument === "--overwrite") {
      options.overwrite = true;
      continue;
    }
    if (argument === "--expansion" || argument === "--output" || argument === "--delay-ms") {
      const value = argv[index + 1];
      if (value == null || value.startsWith("--")) {
        throw new Error(`${argument} requires a value.`);
      }
      index += 1;

      if (argument === "--expansion") options.expansion = value;
      if (argument === "--output") options.output = value;
      if (argument === "--delay-ms") options.delayMs = Number(value);
      continue;
    }

    throw new Error(`Unknown option: ${argument}`);
  }

  if (options.help) return options;
  if (!/^[A-Za-z0-9_-]+$/.test(options.expansion ?? "")) {
    throw new Error("--expansion must contain only letters, numbers, underscores, or hyphens.");
  }
  if (!Number.isFinite(options.delayMs) || options.delayMs < 0) {
    throw new Error("--delay-ms must be a non-negative number.");
  }

  return options;
}

function buildSearchUrl(expansion) {
  const parameters = new URLSearchParams();
  parameters.set("card_name", "");
  parameters.append("class[]", "all");
  parameters.set("title", "");
  parameters.set("expansion_name", expansion);
  parameters.append("cost[]", "all");
  parameters.append("card_kind[]", "all");
  parameters.append("rare[]", "all");
  parameters.set("power_from", "");
  parameters.set("power_to", "");
  parameters.set("hp_from", "");
  parameters.set("hp_to", "");
  parameters.set("type", "");
  parameters.set("ability", "");
  parameters.set("keyword", "");
  parameters.set("view", "image");

  return new URL(SEARCH_PATH + "?" + parameters.toString(), SITE_ORIGIN).toString();
}

function detailUrl(cardNumber) {
  const url = new URL("/cardlist/", SITE_ORIGIN);
  url.searchParams.set("cardno", cardNumber);
  return url.toString();
}

async function readExistingManifest(manifestPath) {
  if (!existsSync(manifestPath)) return { cards: {} };

  try {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    return { cards: manifest.cards ?? {} };
  } catch {
    console.warn(`Ignoring unreadable manifest: ${manifestPath}`);
    return { cards: {} };
  }
}

async function writeAtomically(filePath, content) {
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, content, "utf8");
  await rename(temporaryPath, filePath);
}

async function loadAllSearchResultCards(page) {
  const cardLinks = page.locator('a[href*="cardno="]');
  await cardLinks.first().waitFor({ state: "attached", timeout: 15_000 });

  let previousCount = 0;
  let unchangedAttempts = 0;

  while (unchangedAttempts < 3) {
    const currentCount = await cardLinks.count();
    if (currentCount > previousCount) {
      previousCount = currentCount;
      unchangedAttempts = 0;
    } else {
      unchangedAttempts += 1;
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(750);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  const destination = path.resolve(options.output, options.expansion);
  const manifestPath = path.join(destination, "manifest.json");
  const searchUrl = buildSearchUrl(options.expansion);
  await mkdir(destination, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "shadowverse-evolve-cardlist-dom-fetcher/1.0",
  });

  try {
    console.log(`Fetching search results: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("body");
    await loadAllSearchResultCards(page);

    const searchResult = await page.locator("body").innerText();
    const expectedCount = Number(searchResult.match(/検索結果\s*(\d+)件/)?.[1] ?? "0");
    const cardNumbers = await page.locator('a[href*="cardno="]').evaluateAll((links) => {
      const values = new Set();
      for (const link of links) {
        const url = new URL(link.href, window.location.origin);
        const cardNumber = url.searchParams.get("cardno");
        if (cardNumber) values.add(cardNumber);
      }
      return [...values];
    });

    const cards = [...new Set(cardNumbers)]
      .filter((cardNumber) => /^[A-Za-z0-9_-]+$/.test(cardNumber))
      .sort((left, right) => left.localeCompare(right, "ja"));

    if (cards.length === 0) {
      throw new Error("No card detail links were found. The website markup may have changed.");
    }
    if (expectedCount !== 0 && expectedCount !== cards.length) {
      console.warn(`Search reports ${expectedCount} cards, but ${cards.length} detail links were found.`);
    }

    const manifest = await readExistingManifest(manifestPath);
    const failures = [];

    for (const [index, cardNumber] of cards.entries()) {
      const outputPath = path.join(destination, `${cardNumber}.html`);
      const sourceUrl = detailUrl(cardNumber);

      if (!options.overwrite && existsSync(outputPath)) {
        console.log(`[${index + 1}/${cards.length}] Skipped ${cardNumber} (already saved)`);
        continue;
      }

      try {
        console.log(`[${index + 1}/${cards.length}] Fetching ${cardNumber}`);
        await page.goto(sourceUrl, { waitUntil: "domcontentloaded" });
        await page.waitForSelector("body");
        const dom = await page.content();
        await writeAtomically(outputPath, dom);

        manifest.cards[cardNumber] = {
          source_url: sourceUrl,
          file: `${cardNumber}.html`,
          fetched_at: new Date().toISOString(),
        };
      } catch (error) {
        failures.push({ cardNumber, message: error.message });
        console.error(`[${index + 1}/${cards.length}] Failed ${cardNumber}: ${error.message}`);
      }

      if (index < cards.length - 1 && options.delayMs > 0) {
        await page.waitForTimeout(options.delayMs);
      }
    }

    await writeAtomically(manifestPath, JSON.stringify({
      expansion: options.expansion,
      search_url: searchUrl,
      expected_count: expectedCount || null,
      fetched_count: Object.keys(manifest.cards).length,
      cards: manifest.cards,
      failures,
    }, null, 2) + "\n");

    if (failures.length > 0) {
      throw new Error(`${failures.length} card page(s) could not be saved. See ${manifestPath}.`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

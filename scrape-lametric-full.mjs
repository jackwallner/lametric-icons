#!/usr/bin/env node
/**
 * Full LaMetric Icon Scraper - All 69,007 icons
 * Uses the actual API endpoint
 *
 * Usage: node scrape-lametric-full.mjs
 * Output: ~/scripts/lametric_icon_registry.json
 */

import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.env.HOME, 'lametric-icons');
const REGISTRY_FILE = path.join(OUTPUT_DIR, 'icons.json');
const PROGRESS_FILE = path.join(OUTPUT_DIR, '.progress.json');

const API_BASE = 'https://developer.lametric.com/api/v1/dev/preloadicons';
const PER_PAGE = 80;
const DELAY_MS = 500; // Be nice to the server

// Track all icons
let allIcons = new Map();
let totalIcons = 0;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function saveProgress() {
  const registry = {
    scrapedAt: new Date().toISOString(),
    totalAvailable: totalIcons,
    totalScraped: allIcons.size,
    byId: Object.fromEntries(allIcons),
    byKey: {},
    byCategory: {}
  };

  // Build indexes
  for (const [id, icon] of allIcons) {
    const key = generateKey(icon.name);
    registry.byKey[key] = icon;

    if (!registry.byCategory[icon.category]) {
      registry.byCategory[icon.category] = [];
    }
    registry.byCategory[icon.category].push(icon);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
    lastUpdate: new Date().toISOString(),
    totalAvailable: totalIcons,
    scraped: allIcons.size,
    percentComplete: ((allIcons.size / totalIcons) * 100).toFixed(2) + '%'
  }));

  console.log(`[${new Date().toLocaleTimeString()}] Saved: ${allIcons.size}/${totalIcons} icons (${((allIcons.size / totalIcons) * 100).toFixed(1)}%)`);
}

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      console.log(`Resuming: ${progress.scraped} icons already scraped`);
      totalIcons = progress.totalAvailable;

      if (fs.existsSync(REGISTRY_FILE)) {
        const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
        for (const [id, icon] of Object.entries(registry.byId)) {
          allIcons.set(parseInt(id), icon);
        }
      }
      return Math.floor(allIcons.size / PER_PAGE); // Return starting page
    }
  } catch (err) {
    console.log('Starting fresh scrape');
  }
  return 0;
}

function generateKey(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .substring(0, 50);
}

async function fetchPage(pageNum) {
  const url = `${API_BASE}?page=${pageNum}&category=Popular&search=&count=${PER_PAGE}&guest_icons=`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; IconBot/1.0)'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (pageNum === 0) {
      totalIcons = data.count_all;
      console.log(`Total icons available: ${totalIcons}`);
    }

    return data.icons || [];
  } catch (err) {
    console.error(`Error fetching page ${pageNum}: ${err.message}`);
    return [];
  }
}

async function scrapeAll() {
  console.log('LaMetric Icon Scraper - Full Database');
  console.log('=====================================\n');

  const startPage = loadProgress();
  const totalPages = Math.ceil(69007 / PER_PAGE);

  console.log(`Estimated pages: ${totalPages}`);
  console.log(`Starting from page: ${startPage}\n`);

  for (let page = startPage; page < totalPages; page++) {
    const icons = await fetchPage(page);

    if (icons.length === 0) {
      console.log(`No more icons at page ${page}`);
      break;
    }

    // Add to map (deduplicates)
    let newCount = 0;
    for (const icon of icons) {
      if (!allIcons.has(icon.id)) {
        allIcons.set(icon.id, {
          id: icon.id,
          name: icon.name,
          category: icon.category,
          type: icon.type,
          version: icon.version,
          thumbnail: icon.thumbnail,
          thumbnail_image: icon.thumbnail_image
        });
        newCount++;
      }
    }

    if (page % 10 === 0 || newCount < icons.length) {
      console.log(`Page ${page}: +${newCount} new icons (${icons.length} returned)`);
    }

    // Save every 5 pages
    if (page % 5 === 0) {
      saveProgress();
    }

    // Be nice to server
    await sleep(DELAY_MS);

    // Early exit if we're not getting new icons
    if (page > startPage + 5 && newCount === 0) {
      console.log('No new icons, stopping');
      break;
    }
  }

  saveProgress();

  // Final summary
  console.log('\n=====================================');
  console.log('SCRAPING COMPLETE');
  console.log('=====================================');
  console.log(`Total scraped: ${allIcons.size} / ${totalIcons}`);

  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
  console.log('\nBy category:');
  Object.entries(registry.byCategory)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 15)
    .forEach(([cat, icons]) => {
      console.log(`  ${cat.padEnd(25)}: ${icons.length} icons`);
    });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nInterrupted! Saving progress...');
  saveProgress();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nTerminated! Saving progress...');
  saveProgress();
  process.exit(0);
});

scrapeAll().catch(err => {
  console.error('Failed:', err.message);
  saveProgress();
  process.exit(1);
});

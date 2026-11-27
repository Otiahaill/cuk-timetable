/* Version bump script — CampusPulse
 * Usage: node tools/version.js [--message "msg"] [--version "2026.09-r1"]
 * Reads data/timetable.json, adds meta.version, creates data/version.json
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.resolve('../data');
const TIMETABLE_PATH = path.join(DATA_DIR, 'timetable.json');
const VERSION_PATH = path.join(DATA_DIR, 'version.json');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--message' && i + 1 < args.length) {
      result.message = args[i + 1];
      i++;
    } else if (args[i] === '--version' && i + 1 < args.length) {
      result.version = args[i + 1];
      i++;
    }
  }
  return result;
}

function sha256File(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function generateVersionString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  let revision = 1;
  if (fs.existsSync(VERSION_PATH)) {
    try {
      const existing = JSON.parse(fs.readFileSync(VERSION_PATH, 'utf-8'));
      const match = existing.version?.match(/-r(\d+)$/);
      if (match) revision = parseInt(match[1], 10) + 1;
    } catch {
      // Ignore parse errors
    }
  }
  return `${year}.${month}-r${revision}`;
}

function main() {
  const { message, version: customVersion } = parseArgs();

  if (!fs.existsSync(TIMETABLE_PATH)) {
    console.error(`Error: ${TIMETABLE_PATH} not found`);
    process.exit(1);
  }

  const timetable = JSON.parse(fs.readFileSync(TIMETABLE_PATH, 'utf-8'));
  const version = customVersion || generateVersionString();
  const today = new Date().toISOString().split('T')[0];
  const sha256 = sha256File(TIMETABLE_PATH);
  const msg = message || `Timetable update ${version}`;

  timetable.meta = timetable.meta || {};
  timetable.meta.version = version;

  fs.writeFileSync(TIMETABLE_PATH, JSON.stringify(timetable, null, 2) + '\n');
  console.log(`Updated ${TIMETABLE_PATH} with meta.version = ${version}`);

  const versionInfo = {
    version,
    updated: today,
    timetable_sha256: sha256,
    message: msg,
  };
  fs.writeFileSync(VERSION_PATH, JSON.stringify(versionInfo, null, 2) + '\n');
  console.log(`Created ${VERSION_PATH}:`);
  console.log(JSON.stringify(versionInfo, null, 2));

  console.log('\nDone. Commit with: git add data/timetable.json data/version.json && git commit -m "data(app): version bump to ' + version + ' [M1-02]"');
}

main();

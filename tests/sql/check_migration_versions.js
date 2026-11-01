import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const directory = join(process.cwd(), 'supabase', 'migrations');
const candidateVersions = new Set(process.argv.slice(2));
if (candidateVersions.size === 0) {
  console.error('Pass the pending migration versions to check.');
  process.exit(2);
}
const seen = new Map();
const duplicates = [];
for (const file of readdirSync(directory)) {
  const version = /^(\d{14})_.*\.sql$/.exec(file)?.[1];
  if (!version || !candidateVersions.has(version)) continue;
  if (seen.has(version)) duplicates.push(`${version}: ${seen.get(version)} / ${file}`);
  else seen.set(version, file);
}
for (const version of candidateVersions) {
  if (!seen.has(version)) {
    console.error(`Pending migration version missing: ${version}`);
    process.exitCode = 1;
  }
}
if (duplicates.length) {
  console.error(`Duplicate migration versions:\n${duplicates.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('Pending migration versions do not collide with local files.');
}

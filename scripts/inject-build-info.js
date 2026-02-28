/**
 * Writes .build-info.json with git SHA and build time so app/api/version can read it at runtime.
 * Run before `next build` so the deployed app has the correct commit info.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
let gitSha = '';
try {
  gitSha = execSync('git rev-parse --short HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim();
} catch {
  // not a git repo or git unavailable
}

const buildInfo = {
  gitSha: gitSha || null,
  buildTime: new Date().toISOString(),
};

fs.writeFileSync(
  path.join(repoRoot, '.build-info.json'),
  JSON.stringify(buildInfo, null, 2),
  'utf8'
);

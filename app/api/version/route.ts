import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  const repoRoot = process.cwd();
  let version = '0.0.0';
  let gitSha: string | null = null;
  let buildTime: string | null = null;

  try {
    const pkgPath = path.join(repoRoot, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    version = pkg.version ?? version;
  } catch {
    // ignore
  }

  try {
    const buildInfoPath = path.join(repoRoot, '.build-info.json');
    const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
    gitSha = buildInfo.gitSha ?? null;
    buildTime = buildInfo.buildTime ?? null;
  } catch {
    // .build-info.json not present (e.g. dev without build)
  }

  return NextResponse.json({
    version,
    ...(gitSha && { gitSha }),
    ...(buildTime && { buildTime }),
  });
}

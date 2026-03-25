import { writeFile, readFile, mkdir, readdir } from 'fs/promises';
import { join, isAbsolute } from 'path';
import { createChildLogger } from '../lib/logger.js';
import type { RawParserOutput } from '../types/index.js';

const log = createChildLogger('rawFiles');
const RAW_DIR = join(process.cwd(), 'data', 'raw');

function getParserDir(parserName: string): string {
  return join(RAW_DIR, parserName);
}

export async function listRawFiles(): Promise<string[]> {
  try {
    const names = await readdir(RAW_DIR);
    const files = names
      .filter((n) => n.startsWith('raw-') && n.endsWith('.json'))
      .sort()
      .reverse();
    return files.map((n) => join(RAW_DIR, n));
  } catch {
    return [];
  }
}

export async function listRawFilesByParser(parserName: string): Promise<string[]> {
  const dir = getParserDir(parserName);
  try {
    const names = await readdir(dir);
    const files = names
      .filter((n) => n.endsWith('.json'))
      .sort()
      .reverse();
    return files.map((n) => join(dir, n));
  } catch {
    return [];
  }
}

export async function writeRawToFile(
  rawData: RawParserOutput,
  parserName?: string,
): Promise<string> {
  const dir = parserName ? getParserDir(parserName) : RAW_DIR;
  await mkdir(dir, { recursive: true });
  const fileName = `raw-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.json`;
  const absPath = join(dir, fileName);
  await writeFile(absPath, JSON.stringify(rawData, null, 2), 'utf-8');
  const relPath = join('data', 'raw', ...(parserName ? [parserName] : []), fileName).replace(/\\/g, '/');
  log.info({ path: relPath }, 'raw file written');
  return relPath;
}

export async function readRawFromFile(filePath: string): Promise<RawParserOutput> {
  const absPath = isAbsolute(filePath) ? filePath : join(process.cwd(), filePath);
  const content = await readFile(absPath, 'utf-8');
  return JSON.parse(content) as RawParserOutput;
}

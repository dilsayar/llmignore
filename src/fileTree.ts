// src/fileTree.ts
import { join, resolve, relative } from 'path';
import { readFileSync, readdirSync, statSync } from 'fs';
import * as cliProgress from 'cli-progress';
import chalk from 'chalk';
import type { LLMIgnoreConfig } from './types.js';
import type { Stats } from './types.js';
import { matchesPattern, countTokens } from './parser.js';

export function countFiles(dir: string, config: LLMIgnoreConfig, baseDir: string, maxSize?: number): number {
  let count = 0;
  try {
    const files = readdirSync(dir);
    for (const file of files) {
      const fullPath = join(dir, file);
      const relPath = relative(baseDir, fullPath);
      if (matchesPattern(relPath, fullPath, config.exclude, baseDir, true)) continue;
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        count += countFiles(fullPath, config, baseDir, maxSize);
      } else if (!maxSize || stats.size <= maxSize) {
        count++;
      }
    }
  } catch {
    // Silently skip inaccessible dirs
  }
  return count;
}

export function buildFileTree(
  dir: string, 
  config: LLMIgnoreConfig, 
  baseDir: string, 
  progressBar: cliProgress.SingleBar, 
  logs: string[],
  maxSize?: number
): { tree: string[], contents: string[], stats: Stats } {
  let tree: string[] = [];
  let contents: string[] = [];
  let stats: Stats = { files: 0, lines: 0, tokens: 0, bytes: 0 };
  let files;

  try {
    files = readdirSync(dir);
  } catch (error) {
    logs.push(chalk.red(`Failed to read directory ${dir}: ${error}`));
    return { tree, contents, stats };
  }

  for (const file of files) {
    const fullPath = join(dir, file);
    const relPath = relative(baseDir, fullPath);
    
    if (matchesPattern(relPath, fullPath, config.exclude, baseDir, true)) {
      logs.push(chalk.gray(`Excluded: ${relPath}`));
      continue;
    }

    const statsFile = statSync(fullPath);
    
    if (statsFile.isDirectory()) {
      const subResult = buildFileTree(fullPath, config, baseDir, progressBar, logs, maxSize);
      tree = tree.concat([relPath + '/']).concat(subResult.tree.map(t => '  ' + t));
      contents = contents.concat(subResult.contents);
      stats.files += subResult.stats.files;
      stats.lines += subResult.stats.lines;
      stats.tokens += subResult.stats.tokens;
      stats.bytes += subResult.stats.bytes;
    } else {
      const shouldInclude = config.include.length === 0 || matchesPattern(relPath, fullPath, config.include, baseDir);
      if (!shouldInclude) {
        logs.push(chalk.gray(`Not included: ${relPath}`));
        continue;
      }
      if (maxSize && statsFile.size > maxSize) {
        logs.push(chalk.yellow(`Skipped (too large, ${statsFile.size} bytes): ${relPath}`));
        continue;
      }

      tree.push(relPath);
      stats.files++;
      progressBar.increment();

      try {
        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        stats.lines += lines.length;
        stats.tokens += countTokens(content);
        stats.bytes += statsFile.size;
        contents.push(
          `=== BEGIN FILE: ${relPath} ===`,
          `Path: ${fullPath}`,
          content,
          `=== END FILE: ${relPath} ===\n`
        );
      } catch (error) {
        logs.push(chalk.red(`Failed to read file ${fullPath}: ${error}`));
      }
    }
  }

  return { tree, contents, stats };
}
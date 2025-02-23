// src/types.ts
export interface LLMIgnoreConfig {
  starting_directory: string; // Still included, defaults to process.cwd() in parseLLMIgnore
  project_info: Record<string, string>;
  exclude: string[];
  include: string[];
}

export interface Stats {
  files: number;
  lines: number;
  tokens: number;
  bytes: number;
}
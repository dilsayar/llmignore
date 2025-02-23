// src/cli.ts
import { resolve } from 'path';
import { writeFileSync } from 'fs';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as cliProgress from 'cli-progress';
import { watch } from 'fs/promises';
import { parseLLMIgnore, createFromTemplate } from './parser.js';
import { countFiles, buildFileTree } from './fileTree.js';
export async function main() {
    const program = new Command();
    program
        .name('llmignore')
        .description('Generate LLM context from your codebase with .llmignore')
        .version('1.0.0')
        .helpOption('-h, --help', 'Display help with examples')
        .on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ llmignore init --template node');
        console.log('  $ llmignore generate -o context.txt --max-size 1048576');
        console.log('  $ llmignore generate --watch');
    });
    program
        .command('init')
        .description('Create a new .llmignore file from template')
        .option('-t, --template <language>', 'Specify template (e.g., node, python)')
        .action(async (options) => {
        await createFromTemplate(options.template);
        process.exit(0);
    });
    program
        .command('generate')
        .description('Generate context file from .llmignore')
        .option('-o, --output <file>', 'Output file name', 'llm-context.txt')
        .option('-v, --verbose', 'Show detailed logs during processing', false)
        .option('-m, --max-size <bytes>', 'Skip files larger than this size (bytes)', parseInt)
        .option('-w, --watch', 'Watch for changes and regenerate', false)
        .action(async (options) => {
        const spinner = ora({ text: 'Reading .llmignore', color: 'cyan', spinner: 'dots' }).start();
        let config;
        try {
            config = parseLLMIgnore('.llmignore');
            spinner.succeed(chalk.green('Configuration loaded'));
        }
        catch (error) {
            spinner.fail(chalk.red('No .llmignore found'));
            console.log(chalk.yellow('Run `llmignore init` to create one.'));
            process.exit(1);
        }
        const baseDir = resolve(config.starting_directory);
        const generate = async () => {
            let output = ['=== PROJECT CONTEXT ==='];
            output.push('Project Information:');
            for (const [key, value] of Object.entries(config.project_info)) {
                output.push(`${key}: ${value}`);
            }
            output.push('=====================\n');
            const countSpinner = ora({ text: 'Counting files...', color: 'yellow', spinner: 'bouncingBar' }).start();
            const totalFiles = countFiles(baseDir, config, baseDir, options.maxSize);
            countSpinner.stop();
            const progressBar = new cliProgress.SingleBar({
                format: 'Processing |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total} Files | Tokens: {tokens}',
                barCompleteChar: '\u2588',
                barIncompleteChar: '\u2591',
                hideCursor: true,
                clearOnComplete: true,
                etaBuffer: 50
            }, cliProgress.Presets.shades_classic);
            progressBar.start(totalFiles, 0, { tokens: 0 });
            const logs = [];
            const { tree, contents, stats } = buildFileTree(baseDir, config, baseDir, progressBar, logs, options.maxSize);
            progressBar.update(stats.files, { tokens: stats.tokens });
            progressBar.stop();
            if (options.verbose && logs.length > 0) {
                console.log('\nProcess Logs:');
                logs.forEach(log => console.log(log));
            }
            if (tree.length === 0) {
                console.log(chalk.yellow('\nNo files matched the include/exclude patterns.'));
            }
            else {
                output.push('=== PROCESSED FILE TREE ===');
                output = output.concat(tree);
                output.push('=====================\n');
                output = output.concat(contents);
                writeFileSync(options.output, output.join('\n'));
                console.log(chalk.green(`\nGenerated ${options.output} (${(stats.bytes / 1024).toFixed(2)} KB)`));
                console.log('\nStats:');
                console.log(chalk.cyan(`Files: ${stats.files}`));
                console.log(chalk.cyan(`Lines: ${stats.lines}`));
                console.log(chalk.cyan(`Tokens: ${stats.tokens}`));
                console.log(chalk.cyan(`Size: ${(stats.bytes / 1024).toFixed(2)} KB`));
            }
        };
        await generate();
        if (options.watch) {
            console.log(chalk.blue('\nWatching for changes...'));
            const watcher = watch(baseDir, { recursive: true });
            for await (const event of watcher) {
                console.log(chalk.blue(`Detected change in ${event.filename}`));
                await generate();
            }
        }
        else {
            process.exit(0);
        }
    });
    program.parse();
}

import { join, resolve, relative, isAbsolute, dirname } from 'path';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import enquirer from 'enquirer';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export function parseLLMIgnore(filePath) {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').map(line => line.trim());
    console.log(process.cwd());
    const config = {
        starting_directory: process.cwd(), // Default to CWD
        project_info: {},
        exclude: [],
        include: []
    };
    let currentSection = null;
    for (const line of lines) {
        if (line.startsWith('#') || line === '')
            continue;
        if (line.startsWith('starting_directory:')) {
            config.starting_directory = resolve(line.split(':')[1].trim()); // Override if present
        }
        else if (line.startsWith('[') && line.endsWith(']')) {
            currentSection = line.slice(1, -1);
        }
        else if (currentSection === 'project_info') {
            const [key, value] = line.split(':').map(part => part.trim());
            if (key && value)
                config.project_info[key] = value;
        }
        else if (currentSection === 'exclude') {
            config.exclude.push(line);
        }
        else if (currentSection === 'include') {
            config.include.push(line);
        }
    }
    return config;
}
export function matchesPattern(path, fullPath, patterns, baseDir, isExclude = false) {
    return patterns.some(pattern => {
        const normalizedPattern = pattern.endsWith('/') ? pattern.slice(0, -1) : pattern;
        const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;
        const normalizedFullPath = fullPath.endsWith('/') ? fullPath.slice(0, -1) : fullPath;
        if (isAbsolute(pattern)) {
            if (pattern.endsWith('/')) {
                return isExclude
                    ? normalizedFullPath.includes(normalizedPattern)
                    : normalizedFullPath.startsWith(normalizedPattern) || normalizedFullPath === normalizedPattern;
            }
            else if (pattern.startsWith('*')) {
                return normalizedFullPath.endsWith(pattern.slice(1));
            }
            return normalizedFullPath === normalizedPattern;
        }
        if (pattern.endsWith('/')) {
            if (isExclude) {
                return normalizedPath.includes(normalizedPattern);
            }
            else {
                return normalizedPath.startsWith(normalizedPattern) || normalizedPath === normalizedPattern;
            }
        }
        else if (pattern.startsWith('*')) {
            return normalizedPath.endsWith(pattern.slice(1));
        }
        return normalizedPath === normalizedPattern;
    });
}
export function countTokens(text) {
    return text.split(/\s+/).length;
}
export function listTemplates() {
    const templatesDir = join(dirname(__dirname), 'templates');
    return readdirSync(templatesDir)
        .filter(file => statSync(join(templatesDir, file)).isDirectory());
}
export async function getTemplate(language) {
    const templatePath = join(dirname(__dirname), 'templates', language, '.llmignore');
    try {
        return readFileSync(templatePath, 'utf-8');
    }
    catch {
        return null;
    }
}
export function detectLanguage(dir) {
    const files = readdirSync(dir);
    if (files.includes('package.json'))
        return 'node';
    if (files.includes('requirements.txt') || files.includes('pyproject.toml'))
        return 'python';
    if (files.includes('go.mod'))
        return 'go';
    if (files.includes('CMakeLists.txt') || files.some(f => f.endsWith('.cpp')))
        return 'cpp';
    if (files.includes('pom.xml') || files.includes('build.gradle'))
        return 'java';
    if (files.includes('composer.json'))
        return 'php';
    if (files.includes('Cargo.toml'))
        return 'rust';
    return null;
}
export async function createFromTemplate(language) {
    const templates = listTemplates();
    let selectedLanguage = language;
    if (!selectedLanguage) {
        const detected = detectLanguage(process.cwd());
        const response = await enquirer.prompt({
            type: 'select',
            name: 'language',
            message: detected ? `Detected ${detected}. Use this template?` : 'Select your project language:',
            choices: detected ? [detected, ...templates.filter(t => t !== detected)] : templates
        });
        selectedLanguage = response.language;
    }
    const template = await getTemplate(selectedLanguage);
    if (!template) {
        console.error(chalk.red(`No template found for ${selectedLanguage}`));
        return;
    }
    const projectInfo = await enquirer.prompt([
        { type: 'input', name: 'name', message: 'Project name:', initial: 'My Project' },
        { type: 'input', name: 'description', message: 'Project description:', initial: '' }
    ]);
    const customTemplate = template
        .replace('name: Default Project', `name: ${projectInfo.name}`)
        .replace('description: Generated by llmignore', `description: ${projectInfo.description}`);
    const spinner = ora('Creating .llmignore file').start();
    try {
        writeFileSync('.llmignore', customTemplate);
        spinner.succeed(chalk.green('Created .llmignore file'));
    }
    catch (error) {
        spinner.fail(chalk.red('Failed to create .llmignore file'));
        console.error(error);
    }
}

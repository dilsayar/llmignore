# llmignore

A Node.js tool built with Bun and TypeScript to generate LLM context from a codebase using a `.llmignore` file. This tool helps developers working with large codebases by creating a structured file tree and including relevant file contents, while excluding unnecessary files like `node_modules`, lock files, and binaries.

## Features

- 🚀 **Smart Template System**: Auto-detects project type and suggests appropriate templates
- 📝 **Custom Configuration**: Define project info and file patterns via `.llmignore`
- 🌳 **Structured Output**: Generates file tree and contents with clear delimiters
- 👀 **Watch Mode**: Automatically regenerate context when files change
- 📊 **Progress Tracking**: Real-time progress bars and token counting
- 📏 **Size Control**: Skip files larger than a specified size
- 🎨 **Language Support**: Built-in templates for Node.js, Python, Go, Rust, Java, C++, and PHP

## Installation

```bash
# Install globally with npm
npm install -g llmignore

# Or use with npx
npx llmignore

# Or install with bun (recommended)
bun install -g llmignore
```

## Commands

### Initialize a new project
```bash
# Create a new .llmignore file with interactive prompts
llmignore init

# Use a specific language template
llmignore init --template node
```

### Generate context
```bash
# Basic usage - generates llm-context.txt
llmignore generate

# Specify output file
llmignore generate -o custom-context.txt

# Skip large files (size in bytes)
llmignore generate --max-size 1048576

# Watch for changes
llmignore generate --watch

# Show detailed logs
llmignore generate --verbose
```

## Configuration: `.llmignore` File

The `.llmignore` file defines how your codebase is processed:

```ini
# Optional: specify starting directory (defaults to ./)

# Project information for context
[project_info]
name: My Project
description: A sample project
version: 1.0.0
author: Your Name

# Files and directories to exclude
[exclude]
node_modules/
dist/
*.log
*.svg
*.png
*.jpg
*.bin

# Files and directories to include
[include]
src/
*.ts
*.js
*.json
*.md
```

### Pattern Rules
- `folder/`: Matches directories and their contents
- `*.ext`: Matches files with the specified extension
- Exact paths match specific files/directories
- Comments start with `#`
- Empty lines are ignored

## Output Format

The generated `llm-context.txt` includes:

1. **Project Context**
```
=== PROJECT CONTEXT ===
Project Information:
name: My Project
description: A sample project
...
=====================
```

2. **File Tree**
```
=== PROCESSED FILE TREE ===
src/
  src/index.ts
  src/utils/
    src/utils/helper.ts
README.md
=====================
```

3. **File Contents**
```
=== BEGIN FILE: src/index.ts ===
Path: /absolute/path/to/src/index.ts
// File contents here
=== END FILE: src/index.ts ===
```

## Development

1. Clone and install dependencies:
```bash
git clone https://github.com/dilsayar/llmignore.git
cd llmignore
bun install
```

2. Run in development:
```bash
bun run src/index.ts
```

3. Build for production:
```bash
bun run build
```

## Requirements

- Node.js ≥ 18
- Bun (recommended) or npm/pnpm

## License

MIT License. See [LICENSE](LICENSE) for details.

## Contributing

Feel free to submit issues and pull requests on [GitHub](https://github.com/dilsayar/llmignore).

## Author

**Hüseyin Demirtaş**

### Connect with me
- 🌐 Website: [huseyindemirtas.net](https://huseyindemirtas.net/)
- 📺 YouTube: [@hdingilizce](https://www.youtube.com/@hdingilizce)
- 🐦 Twitter: [@hdingilizce](https://x.com/hdingilizce)
- 📸 Instagram: [@hdingilizce](https://www.instagram.com/hdingilizce)
- 💻 GitHub: [@dilsayar](https://github.com/dilsayar/)

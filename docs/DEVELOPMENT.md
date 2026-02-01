# Development Guide

Complete guide for developing, testing, and contributing to the OpenCode Orxa plugin.

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Building the Project](#building-the-project)
- [Testing](#testing)
- [Local Development Workflow](#local-development-workflow)
- [Making Changes](#making-changes)
- [Code Quality](#code-quality)
- [Debugging](#debugging)
- [Contributing Guidelines](#contributing-guidelines)
- [Release Process](#release-process)

## Development Environment Setup

### Prerequisites

Ensure you have the following installed:

```bash
# Node.js 18+ and npm
node --version  # v18.x.x or higher
npm --version   # 9.x.x or higher

# Git
git --version

# TypeScript (optional, but recommended)
npm install -g typescript
```

### Clone the Repository

```bash
git clone https://github.com/yourusername/opencode-orxa.git
cd opencode-orxa
```

### Install Dependencies

```bash
npm install
```

This installs all development dependencies including:
- TypeScript compiler
- Jest testing framework
- ESLint for linting
- Type definitions

## Project Structure

```
opencode-orxa/
├── src/                          # Source code
│   ├── index.ts                  # Main plugin entry point
│   ├── cli.ts                    # CLI command handlers
│   ├── wizard.ts                 # Interactive setup wizard
│   ├── types.ts                  # TypeScript type definitions
│   ├── config/                   # Configuration management
│   │   ├── schema.ts             # Zod validation schemas
│   │   ├── default-config.ts     # Default configuration values
│   │   └── loader.ts             # Config loading logic
│   ├── commands/                 # Slash command framework
│   │   ├── index.ts              # Command registry
│   │   ├── types.ts              # Command type definitions
│   │   └── built-in/             # Built-in command implementations
│   │       ├── validate.ts
│   │       ├── refactor.ts
│   │       ├── explain.ts
│   │       ├── test.ts
│   │       ├── debug.ts
│   │       ├── commit.ts
│   │       └── search.ts
│   ├── hooks/                    # Lifecycle hooks
│   │   ├── pre-tool-execution.ts
│   │   ├── post-subagent-response.ts
│   │   ├── pre-todo-completion.ts
│   │   ├── session-checkpoint.ts
│   │   ├── todo-continuation-enforcer.ts
│   │   ├── welcome-toast.ts
│   │   ├── comment-checker.ts
│   │   └── agents-md-injector.ts
│   ├── middleware/               # Core enforcement logic
│   │   ├── delegation-enforcer.ts
│   │   ├── todo-guardian.ts
│   │   ├── memory-automation.ts
│   │   └── quality-gates.ts
│   └── utils/                    # Utility functions
│       ├── drift-detector.ts
│       ├── session-memory.ts
│       └── validation.ts
├── agents/                       # Agent definitions
│   ├── orxa.yaml            # Primary: Engineering Manager
│   ├── plan.yaml                 # Primary: Product Manager
│   ├── subagents/                # 13 subagent definitions
│   │   ├── strategist.yaml
│   │   ├── reviewer.yaml
│   │   ├── build.yaml
│   │   ├── coder.yaml
│   │   ├── frontend.yaml
│   │   ├── architect.yaml
│   │   ├── git.yaml
│   │   ├── explorer.yaml
│   │   ├── librarian.yaml
│   │   ├── navigator.yaml
│   │   ├── writer.yaml
│   │   ├── multimodal.yaml
│   │   └── mobile-simulator.yaml
│   └── README.md                 # Agent documentation
├── tests/                        # Test files
│   ├── delegation-enforcer.test.ts
│   ├── todo-guardian.test.ts
│   └── config-loader.test.ts
├── dist/                         # Compiled JavaScript (generated)
├── docs/                         # Documentation
├── package.json                  # Package configuration
├── plugin.yaml                   # Plugin manifest
├── postinstall.mjs               # Post-install setup script
└── tsconfig.json                 # TypeScript configuration
```

## Building the Project

### Full Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

This:
1. Runs the TypeScript compiler (`tsc`)
2. Outputs to `dist/` directory
3. Generates `.js` and `.d.ts` files

### Watch Mode

For development with automatic recompilation:

```bash
npm run dev
```

This watches for file changes and rebuilds automatically.

### Type Checking

Check types without emitting files:

```bash
npm run typecheck
```

### Linting

Run ESLint on all source files:

```bash
npm run lint
```

To fix auto-fixable issues:

```bash
npm run lint -- --fix
```

## Testing

### Run All Tests

```bash
npm test
```

This runs Jest with the configuration in `jest.config.js`.

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

Automatically re-runs tests when files change.

### Run Specific Test File

```bash
npm test -- delegation-enforcer.test.ts
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

Generates a coverage report in `coverage/` directory.

### Test Structure

Tests are organized by component:

```typescript
// Example test structure
describe('Delegation Enforcer', () => {
  describe('enforceDelegation', () => {
    it('should allow orxa to delegate', () => {
      // Test code
    });

    it('should block subagent from delegating', () => {
      // Test code
    });
  });
});
```

### Writing Tests

When adding new features, include tests:

```typescript
import { enforceDelegation } from '../src/middleware/delegation-enforcer';

describe('New Feature', () => {
  it('should do something expected', () => {
    const result = enforceDelegation({
      toolName: 'delegate_task',
      agentName: 'orxa',
      // ...
    });

    expect(result.allow).toBe(true);
  });
});
```

## Local Development Workflow

### Step 1: Build the Project

```bash
npm run build
```

Ensure there are no TypeScript errors.

### Step 2: Link for Local Testing

```bash
npm link
```

This creates a global symlink, making the `orxa` command available system-wide while pointing to your local development version.

### Step 3: Run Postinstall Script

```bash
npm run postinstall
```

This sets up the configuration directories and copies subagent files.

**Note:** The postinstall script creates a default `orxa.json` config file. If you want to test the interactive `orxa init` wizard instead, run:

```bash
ORXA_SKIP_CONFIG=true npm run postinstall
orxa init
```

Or use the `--force` flag to overwrite an existing config:

```bash
orxa init --force
```

### Step 4: Verify Setup

```bash
orxa doctor
```

Should show:
```
✅ Configuration looks good.
Enabled agents: orxa, plan, ...
```

### Step 5: Test with OpenCode

Start OpenCode in a test project:

```bash
cd /path/to/test-project
opencode
```

You should see the Orxa welcome toast.

### Development Cycle

1. **Make changes** to source files in `src/`
2. **Rebuild** with `npm run build` (or use `npm run dev` for watch mode)
3. **Test** with `npm test`
4. **Verify** with `orxa doctor` and OpenCode
5. **Repeat**

### Testing Changes in Real Usage

To test your changes with actual OpenCode usage:

```bash
# Terminal 1: Watch mode
npm run dev

# Terminal 2: Use the linked version
cd /path/to/test-project
opencode
```

Any changes you make will be reflected after rebuilding.

## Making Changes

### Adding a New Hook

1. Create file in `src/hooks/`:

```typescript
// src/hooks/my-new-hook.ts
import { HookContext, EnforcementResult } from '../types';

export const myNewHook = async (context: HookContext): Promise<EnforcementResult> => {
  // Your logic here
  return { allow: true };
};
```

2. Register in `src/index.ts`:

```typescript
import { myNewHook } from './hooks/my-new-hook';

export const orxaPlugin: OrxaPlugin = {
  // ...
  hooks: {
    // ... existing hooks
    myNewHook,
  },
  // ...
};
```

3. Add tests in `tests/`:

```typescript
// tests/my-new-hook.test.ts
describe('myNewHook', () => {
  it('should work correctly', () => {
    // Test implementation
  });
});
```

### Adding a New Slash Command

1. Create file in `src/commands/built-in/`:

```typescript
// src/commands/built-in/my-command.ts
import type { SlashCommand, CommandContext, CommandResult } from '../types';

export const myCommand: SlashCommand = {
  name: 'mycommand',
  description: 'Does something useful',
  aliases: ['mc'],
  handler: async (args: string[], context: CommandContext): Promise<CommandResult> => {
    return {
      success: true,
      message: 'Command executed!',
      actions: ['Action 1', 'Action 2']
    };
  }
};
```

2. Register in `src/commands/index.ts`:

```typescript
import { myCommand } from './built-in/my-command';

export const builtInCommands: SlashCommand[] = [
  // ... existing commands
  myCommand,
];
```

3. Add documentation to `docs/SLASH-COMMANDS.md`

### Modifying Agent Definitions

Agent YAML files are in `agents/`:

```yaml
# agents/subagents/my-agent.yaml
name: my-agent
description: Does something specific
mode: subagent
model: opencode/kimi-k2.5
system_prompt: |
  You are a specialized agent...

tools:
  - read
  - edit
```

After modifying:
1. Test the agent in OpenCode
2. Update relevant documentation
3. Consider if the change affects the Orxa's delegation logic

### Updating Configuration Schema

1. Modify `src/config/schema.ts`:

```typescript
export interface OrxaConfig {
  // ... existing fields
  newField: string;
}

export const orxaConfigSchema = z.object({
  // ... existing schemas
  newField: z.string(),
});
```

2. Update default value in `src/config/default-config.ts`:

```typescript
export const defaultConfig: OrxaConfig = {
  // ... existing defaults
  newField: 'default value',
};
```

3. Update loader in `src/config/loader.ts` if needed

## Code Quality

### TypeScript Guidelines

- Use strict TypeScript settings
- Define interfaces for all public APIs
- Avoid `any` types — use `unknown` with type guards
- Document complex types with JSDoc comments

### Code Style

- Use ESLint configuration provided
- Run `npm run lint` before committing
- Follow existing naming conventions:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and interfaces
  - `kebab-case` for file names

### Documentation

- Add JSDoc comments to public functions
- Update relevant docs in `docs/` directory
- Include examples in documentation

## Debugging

### Console Logging

Add temporary logging for debugging:

```typescript
console.log('[orxa] Debug:', { toolName, agentName, args });
```

Look for `[orxa]` prefixed logs in OpenCode output.

### Verbose Mode

Enable verbose logging in configuration:

```json
{
  "ui": {
    "verboseLogging": true
  }
}
```

### Debugging Tests

Run a specific test with extra output:

```bash
npm test -- --verbose delegation-enforcer.test.ts
```

### Common Issues

#### Changes Not Reflecting

If your changes don't appear in OpenCode:

1. Ensure you've rebuilt: `npm run build`
2. Check for TypeScript errors: `npm run typecheck`
3. Verify the link: `npm ls -g opencode-orxa`
4. Try unlinking and relinking:
   ```bash
   npm unlink
   npm link
   ```

#### Hook Not Called

If your hook isn't being invoked:

1. Verify it's registered in `src/index.ts`
2. Check the hook name matches the plugin.yaml definition
3. Add logging to confirm execution

#### Type Errors

If you see type errors after changes:

```bash
# Clear TypeScript cache
rm -rf dist/
npm run build
```

## Uninstalling Local Development Version

When you're done developing or want to test a clean installation:

### Step 1: Unlink the Package

```bash
npm unlink
```

This removes the global symlink.

### Step 2: Clean Up Configuration (Optional)

```bash
# Remove orxa config
rm -rf ~/.config/opencode/orxa

# Remove from opencode.json
# Edit ~/.config/opencode/opencode.json and remove "opencode-orxa" from plugins
```

### Step 3: Verify Clean State

```bash
# Should return "command not found"
which orxa

# Should show default OpenCode agents
opencode
```

### Step 4: Reinstall (If Needed)

```bash
# Reinstall from npm
npm install -g opencode-orxa

# Or reinstall local version
npm link
npm run postinstall

# Or reinstall with interactive init wizard
npm link
ORXA_SKIP_CONFIG=true npm run postinstall
orxa init
```

## Contributing Guidelines

### Before Submitting

1. **Run all tests:**
   ```bash
   npm test
   ```

2. **Check types:**
   ```bash
   npm run typecheck
   ```

3. **Lint your code:**
   ```bash
   npm run lint
   ```

4. **Build successfully:**
   ```bash
   npm run build
   ```

### Commit Messages

Use conventional commit format:

```
feat: add new slash command for deployment
fix: resolve issue with todo completion detection
docs: update installation instructions
refactor: simplify delegation enforcer logic
test: add tests for quality gates
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests and linting
5. Commit with conventional messages
6. Push to your fork
7. Create a pull request

### PR Checklist

- [ ] Tests pass (`npm test`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (if applicable)

## Release Process

### Version Bump

Update version in `package.json`:

```json
{
  "version": "1.1.0"
}
```

### Pre-publish Check

```bash
npm run prepublishOnly
```

This runs build and tests.

### Publish to npm

```bash
npm publish
```

### Tag Release

```bash
git tag v1.1.0
git push origin v1.1.0
```

### Post-Release

1. Update CHANGELOG.md
2. Create GitHub release notes
3. Announce in relevant channels

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [OpenCode Plugin API](https://docs.opencode.ai/plugins)
- [Project Repository](https://github.com/yourusername/opencode-orxa)

## Getting Help

- Check existing [GitHub Issues](https://github.com/yourusername/opencode-orxa/issues)
- Join [GitHub Discussions](https://github.com/yourusername/opencode-orxa/discussions)
- Review [Architecture Documentation](ARCHITECTURE.md) for internals

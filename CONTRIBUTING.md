# Contributing to OpenCode Orxa

First off, thank you for considering contributing to OpenCode Orxa! It's people like you that make this plugin a great tool for the OpenCode community.

## Welcome! 🎼

Whether you're fixing a bug, adding a feature, improving documentation, or sharing ideas, your contributions are welcome and appreciated.

## Table of Contents

- [Development Setup](#development-setup)
- [Running Tests](#running-tests)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)

## Development Setup

### Prerequisites

- Node.js 18+ or Bun
- npm or pnpm
- Git

### Getting Started

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/opencode-orxa.git
   cd opencode-orxa
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Run tests to ensure everything works:**
   ```bash
   npm test
   ```

### Project Structure

```
opencode-orxa/
├── src/
│   ├── commands/       # Slash command implementations
│   ├── config/         # Configuration handling
│   ├── hooks/          # Lifecycle hooks
│   ├── middleware/     # Core enforcement logic
│   ├── utils/          # Utility functions
│   ├── index.ts        # Main plugin entry
│   ├── cli.ts          # CLI commands
│   └── wizard.ts       # Interactive setup
├── agents/             # Agent YAML definitions
├── tests/              # Test suite
├── package.json
└── README.md
```

## Running Tests

We use Jest for testing. All tests should pass before submitting a PR.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

### Writing Tests

- Place test files in the `tests/` directory
- Name test files with the `.test.ts` suffix
- Aim for high coverage on new features
- Test both success and error cases

Example test structure:
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do something correctly', () => {
    // Test
  });

  it('should handle errors gracefully', () => {
    // Error test
  });
});
```

## Code Style Guidelines

We use TypeScript with strict type checking. Please follow these guidelines:

### TypeScript

- Enable strict mode in `tsconfig.json`
- Use explicit types for function parameters and return values
- Avoid `any` - use `unknown` with type guards instead
- Prefer interfaces over type aliases for object shapes
- Use enums for fixed sets of values

```typescript
// Good
interface Config {
  name: string;
  enabled: boolean;
}

function loadConfig(path: string): Config {
  // Implementation
}

// Avoid
function loadConfig(path: any): any {
  // Implementation
}
```

### Naming Conventions

- **Files**: Use kebab-case (`my-file.ts`)
- **Classes**: Use PascalCase (`MyClass`)
- **Functions/Variables**: Use camelCase (`myFunction`)
- **Constants**: Use UPPER_SNAKE_CASE for true constants (`MAX_RETRIES`)
- **Interfaces/Types**: Use PascalCase (`MyInterface`)

### Code Organization

- Keep functions small and focused (single responsibility)
- Group related functionality into modules
- Use barrel exports (`index.ts`) for clean imports
- Place utility functions in `src/utils/`
- Keep business logic in `src/middleware/`

### Comments

- Write self-documenting code when possible
- Use JSDoc for public APIs
- Explain "why" not "what"
- Keep comments up-to-date with code changes

```typescript
/**
 * Validates the orxa configuration.
 * @param config - The configuration object to validate
 * @returns Validated configuration or throws ValidationError
 */
export function validateConfig(config: unknown): OrxaConfig {
  // Implementation
}
```

## Commit Message Guidelines

We follow conventional commits for clear history and automated changelog generation.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, no logic change)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Build process, dependencies, etc.

### Examples

```
feat(commands): add /validate slash command

Implements the /validate command that auto-invokes strategist
and reviewer agents for plan validation.

fix(delegation): prevent subagents from delegating

Blocks delegate_task calls from non-orxa agents to enforce
the orxa-only delegation pattern.

docs(readme): update configuration examples

Adds examples for agent_overrides and custom_agents configuration.
```

### Best Practices

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- Keep the first line under 72 characters
- Reference issues in the footer: `Closes #123`

## Pull Request Process

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/my-feature
   # or
   git checkout -b fix/my-fix
   ```

2. **Make your changes** following the code style guidelines

3. **Add or update tests** for your changes

4. **Ensure all tests pass:**
   ```bash
   npm test
   npm run typecheck
   npm run lint
   ```

5. **Update documentation** if needed (README.md, inline docs, etc.)

6. **Commit your changes** following commit message guidelines

7. **Push to your fork:**
   ```bash
   git push origin feature/my-feature
   ```

8. **Open a Pull Request** on GitHub

### PR Guidelines

- Fill out the PR template completely
- Link related issues with `Closes #123` or `Relates to #123`
- Keep PRs focused - one feature/fix per PR
- Respond to review feedback promptly and politely
- Ensure CI checks pass before requesting review

### Review Process

1. A maintainer will review your PR within a few days
2. Changes may be requested - this is normal and helps maintain quality
3. Once approved, a maintainer will merge your PR
4. Your contribution will be included in the next release!

## Reporting Issues

Found a bug? We'd love to hear about it so we can fix it!

### Before Reporting

- Check if the issue already exists in the [issue tracker](https://github.com/yourusername/opencode-orxa/issues)
- Try the latest version - the bug may already be fixed
- Search closed issues as well

### How to Report

1. **Use the bug report template** when creating an issue
2. **Provide a clear title** describing the problem
3. **Include steps to reproduce**:
   - What you were doing
   - What you expected to happen
   - What actually happened
4. **Include environment details**:
   - OpenCode version
   - Plugin version
   - Node.js version
   - Operating system
5. **Include relevant logs or error messages**
6. **Add screenshots** if applicable

### Example Bug Report

```markdown
**Description**
The orxa plugin blocks legitimate delegation from the plan agent.

**Steps to Reproduce**
1. Install plugin version 1.2.0
2. Run `opencode`
3. Ask the plan agent to delegate a task
4. See error: "Only orxa can delegate"

**Expected Behavior**
Plan agent should be able to delegate to other agents.

**Actual Behavior**
Delegation is blocked with an error.

**Environment**
- OpenCode: 2.5.1
- Plugin: 1.2.0
- Node.js: 20.10.0
- OS: macOS 14.2

**Logs**
```
[ERROR] Delegation blocked: agent=plan
```
```

## Feature Requests

Have an idea to make OpenCode Orxa better? We'd love to hear it!

### Before Requesting

- Check if the feature already exists
- Search existing feature requests
- Consider if it fits the project's scope (orxa/manager pattern enforcement)

### How to Request

1. **Use the feature request template**
2. **Describe the problem** you're trying to solve
3. **Describe your proposed solution**
4. **Explain alternatives you've considered**
5. **Add any mockups or examples** if applicable

### Feature Request Guidelines

- Focus on the problem, not just the solution
- Consider the impact on existing users
- Be open to discussion and alternative approaches
- Understand that not all requests can be implemented

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

### Unacceptable Behavior

- Harassment or discrimination of any kind
- Trolling, insulting/derogatory comments
- Personal or political attacks
- Publishing others' private information
- Other conduct that could reasonably be considered inappropriate

## Questions?

- **General questions**: Open a [Discussion](https://github.com/yourusername/opencode-orxa/discussions)
- **Quick questions**: Join our community chat (if available)
- **Security issues**: Email security@example.com (do not open public issues)

## Recognition

Contributors will be recognized in our README.md and release notes. Thank you for helping make OpenCode Orxa better!

---

**Thank you for contributing!** 🎼✨

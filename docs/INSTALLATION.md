# Installation Guide

Complete installation instructions for the OpenCode Orxa plugin.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
  - [Method 1: npm (Recommended)](#method-1-npm-recommended)
  - [Method 2: npx (No Install)](#method-2-npx-no-install)
  - [Method 3: Bun](#method-3-bun)
  - [Method 4: OpenCode Plugin Manager](#method-4-opencode-plugin-manager)
  - [Method 5: Local Development](#method-5-local-development)
- [Post-Installation Setup](#post-installation-setup)
- [Verifying Installation](#verifying-installation)
- [Required Dependencies](#required-dependencies)
- [Troubleshooting](#troubleshooting)
- [Uninstallation](#uninstallation)

## Prerequisites

Before installing OpenCode Orxa, ensure you have:

1. **Node.js** version 18 or higher
   ```bash
   node --version  # Should show v18.x.x or higher
   ```

2. **OpenCode** installed and configured
   ```bash
   opencode --version
   ```

3. **npm** or compatible package manager (yarn, pnpm, bun)
   ```bash
   npm --version
   ```

## Installation Methods

### Method 1: npm (Recommended)

Install globally using npm:

```bash
npm install -g opencode-orxa
```

This will:
- Install the plugin globally
- Run the postinstall script automatically
- Create the configuration directory at `~/.config/opencode/orxa/`
- Register the plugin in `~/.config/opencode/opencode.json`

#### What the Postinstall Script Does

When you install globally, the postinstall script automatically:

1. **Creates directory structure:**
   ```
   ~/.config/opencode/orxa/
   ├── orxa.json
   └── agents/
       ├── custom/
       └── overrides/
   ```

2. **Generates default configuration** (`orxa.json`)

3. **Registers the plugin** in OpenCode's config

### Method 2: npx (No Install)

If you prefer not to install globally, use npx:

```bash
npx opencode-orxa init
```

This runs the setup wizard without permanently installing the package. Note that you'll need to run this command each time you want to use the orxa CLI.

### Method 3: Bun

If you use Bun as your package manager:

```bash
bun add -g opencode-orxa
```

Bun will handle the postinstall script the same way npm does.

### Method 4: OpenCode Plugin Manager

OpenCode has a built-in plugin manager:

```bash
opencode plugin install opencode-orxa
```

Note: This method may require additional manual configuration steps.

### Method 5: Local Development

For development or testing local changes:

#### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/opencode-orxa.git
cd opencode-orxa
```

#### Step 2: Install Dependencies

```bash
npm install
```

#### Step 3: Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

#### Step 4: Link for Local Testing

```bash
npm link
```

This creates a global symlink to your local development version.

#### Step 5: Run Postinstall Script

```bash
npm run postinstall
```

This sets up the configuration directories and registers the plugin.

#### Alternative: Direct Execution

You can also run the plugin directly without linking:

```bash
# Run the CLI directly
node dist/cli.js init

# Or use npm scripts
npm run orxa:init
npm run orxa:install
```

## Post-Installation Setup

After installation, run the interactive setup wizard:

```bash
orxa init
```

This wizard will:

1. **Verify your OpenCode installation**
2. **Check for required dependencies**
3. **Configure initial settings:**
   - Select which agents to enable
   - Choose enforcement levels
   - Set default models
4. **Validate the configuration**

### Non-Interactive Setup

For CI/CD or automated environments:

```bash
orxa init --non-interactive
```

This uses default settings without prompting.

### Force Override

To reset configuration to defaults:

```bash
orxa init --force
```

⚠️ **Warning:** This will overwrite your existing configuration.

## Verifying Installation

### Step 1: Check CLI Availability

```bash
orxa doctor
```

Expected output:
```
✅ Configuration looks good.
Enabled agents: orxa, plan, strategist, reviewer, build, coder, frontend, architect, git, explorer, librarian, navigator, writer, multimodal, mobile-simulator
Disabled agents: none
```

### Step 2: Verify Configuration File

Check that the config file exists:

```bash
cat ~/.config/opencode/orxa/orxa.json
```

You should see a valid JSON configuration.

### Step 3: Check Plugin Registration

Verify the plugin is registered in OpenCode:

```bash
cat ~/.config/opencode/opencode.json | grep -A5 '"plugin"'
```

You should see `"opencode-orxa"` in the plugins array.

### Step 4: Test with OpenCode

Start OpenCode:

```bash
opencode
```

Look for the welcome toast:
- ✅ **Success:** "🎼 OpenCode Orxa" appears
- ✅ **Success:** Default agent is "orxa"
- ❌ **Failure:** Default OpenCode agents load instead

### Step 5: Test a Delegation

Try a simple task:

```
You: Create a simple TODO list

Orxa: I'll create a TODO list for you...
[Orxa should delegate to appropriate subagent]
```

If the Orxa delegates instead of doing the work directly, installation is successful.

## Required Dependencies

The following plugins are recommended for full functionality, but only some are required:

### Core Dependencies

| Plugin                       | Purpose           | Required     | Installation                                         |
|------------------------------|-------------------|--------------|------------------------------------------------------|
| `opencode-supermemory`       | Persistent memory | **Optional** | See [Supermemory Setup](#supermemory-setup) below    |
| `opencode-openai-codex-auth` | Authentication    | Recommended  | `opencode plugin install opencode-openai-codex-auth` |
| `opencode-sync-plugin`       | Session sync      | Recommended  | `opencode plugin install opencode-sync-plugin`       |

### Checking Dependencies

```bash
opencode plugin list
```

Look for the required plugins in the output.

### Installing Missing Dependencies

```bash
# Install recommended plugins (excluding supermemory - see below)
opencode plugin install opencode-openai-codex-auth opencode-sync-plugin
```

## Supermemory Setup (Optional but Recommended)

Supermemory provides **persistent memory across sessions**, allowing the Orxa to remember important patterns, configurations, and decisions from previous conversations.

### What is Supermemory?

Supermemory is an **optional** plugin that enhances the Orxa with:

- **Cross-session memory**: Remember important decisions and patterns
- **Project knowledge**: Store and retrieve project-specific configurations
- **Error solutions**: Learn from past fixes and apply them automatically
- **Architecture patterns**: Maintain consistent coding patterns

### Is Supermemory Required?

**No.** The Orxa works perfectly fine without supermemory. If you choose not to install it:

- Memory features will be automatically disabled
- The plugin will operate in "memory-less" mode
- All other features (delegation, TODO tracking, quality gates) work normally

### Installing Supermemory

#### Step 1: Install the Plugin

```bash
bunx opencode-supermemory@latest install --no-tui
```

Or via OpenCode's plugin manager:

```bash
opencode plugin install opencode-supermemory
```

#### Step 2: Get Your API Key

1. Visit [https://www.supermemory.ai](https://www.supermemory.ai)
2. Sign up or log in to your account
3. Navigate to the API keys section
4. Generate a new API key (starts with `sm_`)

#### Step 3: Configure the API Key

**Option A: Config File (Recommended)**

Create or edit `~/.config/opencode/supermemory.jsonc`:

```json
{
  "apiKey": "sm_your_api_key_here"
}
```

**Option B: Environment Variable**

Add to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):

```bash
export SUPERMEMORY_API_KEY=sm_your_api_key_here
```

Then reload your shell:

```bash
source ~/.zshrc  # or ~/.bashrc
```

#### Step 4: Verify Installation

```bash
orxa doctor
```

You should see:
```
✅ Supermemory is installed and configured
```

### Disabling Memory Features

If you prefer not to use supermemory, you can disable memory features during setup:

```bash
orxa init
# When prompted, select "Disable memory features permanently"
```

Or manually edit `~/.config/opencode/orxa/orxa.json`:

```json
{
  "orxa": {
    "enforcement": {
      "memoryAutomation": "off"
    }
  }
}
```

Valid values for `memoryAutomation`:
- `"strict"` - Full memory automation (requires supermemory)
- `"warn"` - Enable features but warn if supermemory unavailable
- `"off"` - Completely disable memory features

### Troubleshooting Supermemory

#### "Supermemory not detected"

The init wizard will automatically detect this and offer to:
1. Install supermemory
2. Skip for now (enables warn mode)
3. Disable memory features permanently

#### "API key not configured"

If supermemory is installed but no API key is found:

1. Check your config file exists: `cat ~/.config/opencode/supermemory.jsonc`
2. Verify the environment variable: `echo $SUPERMEMORY_API_KEY`
3. Re-run the init wizard: `orxa init`

#### "Could not save to supermemory"

If you see warnings about saving to supermemory:

- Check your API key is valid
- Verify network connectivity
- Consider setting `memoryAutomation` to `"off"` if issues persist

## Troubleshooting

### Issue: "orxa: command not found"

**Cause:** The global npm bin directory is not in your PATH.

**Solution:**

```bash
# Find npm's global bin directory
npm bin -g

# Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
export PATH="$(npm bin -g):$PATH"

# Reload your shell
source ~/.zshrc  # or ~/.bashrc
```

### Issue: "Plugin not registered in opencode.json"

**Cause:** The postinstall script couldn't find or modify opencode.json.

**Solution:**

```bash
# Manually add to ~/.config/opencode/opencode.json
{
  "plugin": ["opencode-orxa"]
}
```

### Issue: "Config validation failed"

**Cause:** The orxa.json file has invalid JSON or schema violations.

**Solution:**

```bash
# Reset to defaults
orxa init --force

# Or manually fix the JSON
orxa config  # Opens in editor
```

### Issue: "Default agents still loading"

**Cause:** The config handler isn't intercepting OpenCode's agent configuration.

**Solution:**

1. Verify plugin is in opencode.json plugins array
2. Check for conflicting plugins
3. Restart OpenCode completely
4. Run `orxa doctor` to diagnose

### Issue: Permission Denied (macOS/Linux)

**Cause:** npm global directory permissions.

**Solution:**

```bash
# Option 1: Change npm's default directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Option 2: Use npx instead
npx opencode-orxa init

# Option 3: Fix permissions (not recommended)
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

### Issue: Windows Installation Problems

**Cause:** Windows path or shell issues.

**Solution:**

1. Use PowerShell or Git Bash (not Command Prompt)
2. Ensure Node.js is in your system PATH
3. Run PowerShell as Administrator for global installs
4. Consider using WSL2 for better compatibility

## Uninstallation

To completely remove OpenCode Orxa:

### Step 1: Unlink/Uninstall the Package

```bash
# If installed via npm link (local development)
npm unlink opencode-orxa

# If installed via npm -g
npm uninstall -g opencode-orxa

# If installed via bun
bun remove -g opencode-orxa
```

### Step 2: Remove Configuration Directory

```bash
rm -rf ~/.config/opencode/orxa
```

This removes:
- Configuration files
- Custom agents
- Agent overrides
- Schemas

⚠️ **Warning:** This cannot be undone. Back up any custom agents first:

```bash
# Backup before removal
cp -r ~/.config/opencode/orxa/agents/custom ~/orxa-agents-backup
```

### Step 3: Remove from OpenCode Configuration

Edit `~/.config/opencode/opencode.json` and remove `"opencode-orxa"` from the plugins array:

```json
{
  "plugin": [
    // Remove this line:
    // "opencode-orxa"
  ]
}
```

### Step 4: Verify Removal

```bash
# Should return "command not found"
orxa doctor

# Start OpenCode — should show default welcome, not Orxa
opencode
```

### Complete Cleanup Script

```bash
#!/bin/bash
# save as uninstall-orxa.sh

echo "Uninstalling OpenCode Orxa..."

# Unlink/uninstall
npm unlink opencode-orxa 2>/dev/null || true
npm uninstall -g opencode-orxa 2>/dev/null || true

# Remove config
rm -rf ~/.config/opencode/orxa

# Remove from opencode.json
if [ -f ~/.config/opencode/opencode.json ]; then
  # Use jq if available
  if command -v jq &> /dev/null; then
    jq 'del(.plugin[] | select(. == "opencode-orxa"))' \
       ~/.config/opencode/opencode.json > /tmp/opencode.json.tmp && \
       mv /tmp/opencode.json.tmp ~/.config/opencode/opencode.json
  else
    echo "Please manually remove 'opencode-orxa' from ~/.config/opencode/opencode.json"
  fi
fi

echo "Uninstallation complete!"
```

## Next Steps

After successful installation:

1. **Read the [Configuration Guide](CONFIGURATION.md)** — Customize for your workflow
2. **Try [Slash Commands](SLASH-COMMANDS.md)** — Powerful workflow shortcuts
3. **Learn about [Agents](AGENTS.md)** — Understand the agent fleet
4. **Explore [Architecture](ARCHITECTURE.md)** — How it all works

## Getting Help

If you encounter issues not covered here:

1. Run `orxa doctor` for diagnostics
2. Check the [Troubleshooting](#troubleshooting) section above
3. Search [GitHub Issues](https://github.com/yourusername/opencode-orxa/issues)
4. Create a new issue with:
   - Your operating system
   - Node.js version (`node --version`)
   - npm version (`npm --version`)
   - Output of `orxa doctor`
   - Error messages (if any)

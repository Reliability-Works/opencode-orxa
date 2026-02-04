# Troubleshooting Guide

Solutions for common issues with the OpenCode Orxa plugin.

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Installation Issues](#installation-issues)
- [Configuration Issues](#configuration-issues)
- [Agent Issues](#agent-issues)
- [Delegation Issues](#delegation-issues)
- [Quality Gate Issues](#quality-gate-issues)
- [Memory Issues](#memory-issues)
- [Orxa Mode Issues](#orxa-mode-issues)
- [Performance Issues](#performance-issues)
- [Getting Help](#getting-help)

---

## Quick Diagnostics

### Run the Doctor Command

Always start with:

```bash
orxa doctor
```

**Expected Output:**
```
✅ Configuration looks good.
Enabled agents: orxa, plan, strategist, reviewer, build, coder, frontend, architect, git, explorer, librarian, navigator, writer, multimodal, mobile-simulator
Disabled agents: none
✅ Supermemory is installed and configured
✅ All agent YAML files found
✅ Plugin properly registered
```

### Check Plugin Status

```bash
# Verify plugin is registered
cat ~/.config/opencode/opencode.json | grep -A5 '"plugin"'

# Check config file exists
cat ~/.config/opencode/orxa/orxa.json

# List installed agents
ls -la ~/.config/opencode/orxa/agents/
```

---

## Installation Issues

### "orxa: command not found"

**Problem:** CLI command not available.

**Causes & Solutions:**

1. **Not in PATH**
   ```bash
   # Find npm's global bin
   npm bin -g
   
   # Add to shell profile (~/.bashrc, ~/.zshrc)
   export PATH="$(npm bin -g):$PATH"
   
   # Reload shell
   source ~/.zshrc  # or ~/.bashrc
   ```

2. **Not installed globally**
   ```bash
   npm install -g opencode-orxa
   ```

3. **Using npx instead**
   ```bash
   npx opencode-orxa doctor
   ```

### "Plugin not registered in opencode.json"

**Problem:** Postinstall script couldn't modify config.

**Solution:**
```bash
# Manually add to ~/.config/opencode/opencode.json
{
  "plugin": ["opencode-orxa"]
}
```

Or run:
```bash
orxa init
```

### Permission Denied (macOS/Linux)

**Problem:** npm global directory permissions.

**Solutions:**

1. **Change npm prefix (Recommended)**
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   export PATH=~/.npm-global/bin:$PATH
   ```

2. **Use npx (No install)**
   ```bash
   npx opencode-orxa init
   ```

### Windows Installation Problems

**Problem:** Path or shell issues on Windows.

**Solutions:**
1. Use PowerShell or Git Bash (not Command Prompt)
2. Run PowerShell as Administrator
3. Ensure Node.js is in system PATH
4. Consider WSL2 for better compatibility

---

## Configuration Issues

### "Config validation failed"

**Problem:** `orxa.json` has schema violations.

**Diagnosis:**
```bash
orxa doctor
# Look for: "Validation error: ..."
```

**Common Issues:**

1. **Invalid JSON**
   ```bash
   # Validate JSON syntax
   cat ~/.config/opencode/orxa/orxa.json | python -m json.tool
   ```

2. **Primary agent override violation**
   ```json
   // ❌ WRONG - Primary agents can only override model
   {
     "agent_overrides": {
       "orxa": {
         "model": "...",
         "temperature": 0.5  // Not allowed!
       }
     }
   }
   
   // ✅ CORRECT
   {
     "agent_overrides": {
       "orxa": {
         "model": "opencode/gpt-5.2-codex"
       }
     }
   }
   ```

3. **Missing required fields**
   ```bash
   # Reset to defaults
   orxa init --force
   ```

### Configuration Not Loading

**Problem:** Changes don't take effect.

**Solutions:**
1. Check file location: `~/.config/opencode/orxa/orxa.json`
2. Validate JSON syntax
3. Restart OpenCode completely
4. Check for legacy config: `.opencode/orxa.config.json`

### Legacy Config Warning

**Problem:** Using deprecated project-level config.

**Solution:**
```bash
# Migrate to user-level config
mv .opencode/orxa.config.json ~/.config/opencode/orxa/orxa.json
```

---

## Agent Issues

### "Agent not found"

**Problem:** Agent doesn't exist or isn't enabled.

**Diagnosis:**
```bash
orxa doctor
# Check "Enabled agents" list
```

**Solutions:**

1. **Add to enabled_agents**
   ```json
   {
     "enabled_agents": [
       "orxa",
       "plan",
       "build",  // Add missing agent
       "coder"
     ]
   }
   ```

2. **Check agent file exists**
   ```bash
   ls ~/.config/opencode/orxa/agents/subagents/build.yaml
   ```

3. **Validate YAML syntax**
   ```bash
   # Use online YAML validator or
   node -e "require('js-yaml').load(require('fs').readFileSync('path/to/agent.yaml'))"
   ```

### "Default agents still loading"

**Problem:** Config handler not intercepting OpenCode config.

**Solutions:**
1. Verify plugin in `opencode.json` plugins array
2. Check for conflicting plugins
3. Restart OpenCode completely
4. Check OpenCode logs for plugin loading errors

### Custom Agent Not Loading

**Problem:** Custom agent doesn't appear.

**Checklist:**
- [ ] File in `~/.config/opencode/orxa/agents/custom/`
- [ ] Valid YAML syntax
- [ ] `name` field matches filename
- [ ] Added to `enabled_agents`
- [ ] OpenCode restarted

### Agent Override Not Working

**Problem:** Override settings not applied.

**Checklist:**
- [ ] File in correct overrides directory
- [ ] Valid YAML syntax
- [ ] For primary agents: only `model` can be overridden
- [ ] No conflicting overrides
- [ ] OpenCode restarted

---

## Delegation Issues

### "Only @orxa can delegate"

**Problem:** Subagent tried to delegate.

**This is expected behavior!** Only Orxa should delegate.

**If you see this unexpectedly:**
1. Check enforcement level: `"delegation": "strict"`
2. Verify agent identity
3. Check if tool alias is causing confusion

### Delegation Not Working

**Problem:** Orxa tries to do work instead of delegating.

**Solutions:**
1. Check enforcement settings
2. Verify Orxa agent definition loaded correctly
3. Check for tool restriction errors
4. Review Orxa system prompt

### "Tool not allowed"

**Problem:** Agent tried to use blocked tool.

**Solutions:**
1. Check tool restrictions in config
2. Verify agent's allowed tools list
3. Delegate to appropriate agent instead

**Example:**
```
❌ Orxa cannot use grep. 
✅ Delegate to @plan for research tasks.
```

---

## Quality Gate Issues

### Gates Failing

**Problem:** Quality gates always fail.

**Diagnosis:**
```bash
# Run gates manually
npm run lint
npm run typecheck
npm test
npm run build
```

**Solutions:**

1. **Disable problematic gates temporarily**
   ```json
   {
     "qualityGates": {
       "requireLint": false,
       "requireTypeCheck": true
     }
   }
   ```

2. **Fix underlying issues**
   ```bash
   npm run lint -- --fix
   ```

3. **Adjust for your project**
   ```json
   {
     "qualityGates": {
       "customValidators": [
         {
           "name": "My Project Check",
           "command": "npm run my-check",
           "required": true
         }
       ]
     }
   }
   ```

### LSP Diagnostics Failing

**Problem:** LSP server not responding.

**Solutions:**
1. Ensure LSP server is installed
2. Check LSP configuration
3. Try without LSP gate:
   ```json
   {
     "qualityGates": {
       "requireLspDiagnostics": false
     }
   }
   ```

### Tests Not Found

**Problem:** Test gate fails with "no tests found".

**Solutions:**
1. Check test configuration
2. Verify test files exist
3. Disable test gate if not applicable:
   ```json
   {
     "qualityGates": {
       "requireTests": false
     }
   }
   ```

---

## Memory Issues

### "Supermemory not detected"

**Problem:** Memory features unavailable.

**Solutions:**

1. **Install supermemory (optional)**
   ```bash
   bunx opencode-supermemory@latest install --no-tui
   ```

2. **Configure API key**
   ```json
   // ~/.config/opencode/supermemory.jsonc
   {
     "apiKey": "sm_your_key_here"
   }
   ```

3. **Disable memory features**
   ```json
   {
     "orxa": {
       "enforcement": {
         "memoryAutomation": "off"
       }
     }
   }
   ```

### "Could not save to supermemory"

**Problem:** API errors when saving.

**Solutions:**
1. Check API key is valid
2. Verify network connectivity
3. Check supermemory service status
4. Set to warn mode:
   ```json
   {
     "orxa": {
       "enforcement": {
         "memoryAutomation": "warn"
       }
     }
   }
   ```

### Memory Not Extracting

**Problem:** Patterns not being detected.

**Solutions:**
1. Check extract patterns in config
2. Verify autoExtract is enabled
3. Check memory types list
4. Review subagent responses for patterns

---

## Orxa Mode Issues

### "/orchestrate command not detected"

**Problem:** Orxa mode not activating.

**Solutions:**
1. Ensure `/orchestrate` is typed as a standalone command (not part of another word)
2. Use lowercase `/orchestrate` (commands are case-sensitive)
3. Verify orchestration is enabled:
   ```json
   {
     "orchestration": {
       "enabled": true
     }
   }
   ```

### Workstream Stuck

**Problem:** Workstream shows "in_progress" indefinitely.

**Solutions:**
1. Check timeout settings
2. Verify worker agent responding
3. Check worktree directory
4. Cancel and retry:
   ```bash
   # Remove worktree
   git worktree remove orxa-{name}
   ```

### Merge Conflicts

**Problem:** Workstreams conflict during merge.

**Solutions:**
1. Enable merge approval:
   ```json
   {
     "orchestration": {
       "require_merge_approval": true,
       "auto_merge": false
     }
   }
   ```

2. Manually resolve conflicts
3. Check workstream boundaries (may overlap)

### Circular Dependencies

**Problem:** "Circular dependency detected" error.

**Solutions:**
1. Review workstream specifications
2. Extract common base workstream
3. Reorder to eliminate cycles

### Worktree Creation Fails

**Problem:** "Failed to create worktree".

**Solutions:**
1. Check disk space
2. Verify clean git state
3. Check if worktree already exists
4. Ensure git 2.5+:
   ```bash
   git --version
   ```

---

## Performance Issues

### Slow Response Times

**Problem:** Commands take too long.

**Solutions:**

1. **Reduce parallel workstreams**
   ```json
   {
     "orchestration": {
       "max_parallel_workstreams": 3
     }
   }
   ```

2. **Use faster models**
   ```json
   {
     "subagents": {
       "defaults": {
         "model": "opencode/kimi-k2.5"
       }
     }
   }
   ```

3. **Disable unnecessary gates**
   ```json
   {
     "qualityGates": {
       "requireLspDiagnostics": false
     }
   }
   ```

4. **Reduce checkpoint frequency**
   ```json
   {
     "memory": {
       "sessionCheckpointInterval": 50
     }
   }
   ```

### High Memory Usage

**Problem:** System running out of memory.

**Solutions:**
1. Reduce parallel workstreams
2. Disable verbose logging
3. Clear old worktrees
4. Reduce context window sizes

### Plugin Loading Slow

**Problem:** OpenCode takes long to start.

**Solutions:**
1. Disable unused agents
2. Reduce custom validators
3. Check for large config files
4. Verify agent YAML files aren't corrupted

---

## Getting Help

### Before Asking for Help

1. **Run diagnostics:**
   ```bash
   orxa doctor
   ```

2. **Check logs:**
   ```bash
   # Look for [orxa] prefixed messages
   opencode --verbose
   ```

3. **Verify setup:**
   ```bash
   # Check versions
   node --version
   npm --version
   opencode --version
   orxa doctor
   ```

### Information to Provide

When reporting issues, include:

1. **System Info:**
   - Operating system
   - Node.js version (`node --version`)
   - npm version (`npm --version`)

2. **Plugin Info:**
   - Output of `orxa doctor`
   - Plugin version
   - OpenCode version

3. **Configuration:**
   - Relevant config sections (redact sensitive data)
   - Agent overrides
   - Custom agents

4. **Error Details:**
   - Full error message
   - Steps to reproduce
   - Expected vs actual behavior

### Support Channels

1. **GitHub Issues:** [Report bugs](https://github.com/yourusername/opencode-orxa/issues)
2. **GitHub Discussions:** [Ask questions](https://github.com/yourusername/opencode-orxa/discussions)
3. **Documentation:** Check relevant docs:
   - [CONFIGURATION.md](CONFIGURATION.md)
   - [AGENTS.md](AGENTS.md)
   - [ARCHITECTURE.md](ARCHITECTURE.md)
   - [ORXA-MODE.md](ORXA-MODE.md)

### Debug Mode

Enable verbose logging:

```json
{
  "ui": {
    "verboseLogging": true
  }
}
```

Look for `[orxa]` prefixed messages in OpenCode output.

---

## Quick Fix Reference

| Issue              | Quick Fix                     |
| -------            | -----------                   |
| Config errors      | `orxa init --force`           |
| Agent not found    | Add to `enabled_agents`       |
| Delegation blocked | Check enforcement level       |
| Gates failing      | Disable problematic gates     |
| Memory errors      | Set `memoryAutomation: "off"` |
| Orxa mode issues   | Check `orchestration.enabled` |
| Slow performance   | Reduce parallel workstreams   |
| Plugin not loading | Check `opencode.json` plugins |

---

## Related Documentation

- [CONFIGURATION.md](CONFIGURATION.md) — Configuration reference
- [AGENTS.md](AGENTS.md) — Agent system
- [ARCHITECTURE.md](ARCHITECTURE.md) — Technical details
- [ORXA-MODE.md](ORXA-MODE.md) — Orchestration guide
- [FEATURES.md](FEATURES.md) — All capabilities

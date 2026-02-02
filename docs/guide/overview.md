# Getting Started with OpenCode Orxa

Your first steps with Orxa — from installation to your first successful delegation.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Initial Setup](#initial-setup)
- [Understanding the Interface](#understanding-the-interface)
- [Your First Interaction](#your-first-interaction)
- [Understanding What Happened](#understanding-what-happened)
- [Next Steps](#next-steps)

---

## Prerequisites

Before starting, ensure you have:

1. **Node.js 18+** installed
   ```bash
   node --version  # Should show v18.x.x or higher
   ```

2. **OpenCode** installed and configured
   ```bash
   opencode --version
   ```

3. **npm** or compatible package manager
   ```bash
   npm --version
   ```

---

## Installation

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

### Method 2: npx (No Install)

If you prefer not to install globally:

```bash
npx opencode-orxa init
```

### Verification

Check that the installation worked:

```bash
orxa doctor
```

You should see output like:

```
✅ Configuration looks good.
Enabled agents: orxa, plan, strategist, reviewer, build, coder, frontend, architect, git, explorer, librarian, navigator, writer, multimodal, mobile-simulator
Disabled agents: none
```

---

## Initial Setup

### Run the Setup Wizard

The interactive wizard will guide you through initial configuration:

```bash
orxa init
```

**What the wizard does:**

1. **Verifies your OpenCode installation**
2. **Checks for required dependencies**
3. **Configures initial settings:**
   - Select which agents to enable
   - Choose enforcement levels
   - Set default models
4. **Validates the configuration**

### Configuration Options

During setup, you'll be asked about:

#### Enforcement Levels

| Setting               | Options             | Recommendation    |
| ---------             | ---------           | ----------------  |
| **Delegation**        | strict / warn / off | Start with `warn` |
| **TODO Completion**   | strict / warn / off | Start with `warn` |
| **Quality Gates**     | strict / warn / off | Start with `warn` |
| **Memory Automation** | strict / warn / off | Start with `warn` |

**Our recommendation:** Start with `warn` for everything. This lets you see when rules would be enforced without blocking your work. Once comfortable, switch to `strict`.

#### Agent Selection

By default, all 15 agents are enabled. For beginners, we recommend keeping them all — you'll learn which to use when through experience.

#### Supermemory (Optional)

The wizard will detect if supermemory is installed. This provides persistent memory across sessions but is **completely optional**.

- **If installed:** Memory features will be enabled
- **If not installed:** You'll be asked if you want to skip or disable memory features

---

## Understanding the Interface

### Welcome Toast

When you start OpenCode, you'll see:

```
🎼 OpenCode Orxa
15 agents loaded • Strict mode
```

This confirms:
- ✅ Orxa plugin is active
- ✅ All 15 agents are loaded
- ✅ Enforcement mode (strict/warn/off)

### The Orxa Agent

Unlike default OpenCode where you might switch between agents, **Orxa is always your primary interface**. You talk to Orxa, and Orxa delegates to specialists as needed.

### Agent Mentions

When Orxa delegates, you'll see:

```
Orxa: I'll delegate this to the frontend specialist.

@frontend: I've created the component...
```

The `@frontend` indicates the subagent responding.

---

## Your First Interaction

Let's walk through a simple example.

### Step 1: Start OpenCode

```bash
opencode
```

Wait for the welcome toast: "🎼 OpenCode Orxa"

### Step 2: Make a Simple Request

Type a simple request:

```
Create a simple TODO list for implementing a login feature
```

### Step 3: Observe the Response

You should see something like:

```
Orxa: I'll create a TODO list for implementing a login feature.

Let me break this down into actionable items:

**TODO List Created:**

- [ ] Design login form UI component
- [ ] Implement form validation logic  
- [ ] Create authentication API endpoint
- [ ] Add error handling and user feedback
- [ ] Write tests for login functionality

Would you like me to start implementing any of these items?
```

### Step 4: Ask for Implementation

Now ask Orxa to implement one item:

```
Implement the login form UI component
```

### Step 5: Watch the Delegation

You should see:

```
Orxa: I'll delegate the login form UI to the frontend specialist.

@frontend: I'll create a login form component. Let me first check the existing project structure...

[Frontend agent reads relevant files]

I've created the LoginForm component at src/components/LoginForm.tsx with:
- Email and password inputs
- Form validation
- Error message display
- Loading state

The component uses React Hook Form for validation and follows the existing component patterns.
```

### Step 6: Quality Verification

After the subagent completes, Orxa will verify:

```
Orxa: The login form has been created. Running quality gates...

✓ Lint passes
✓ TypeScript check passes
✓ Build succeeds

TODO updated: Design login form UI component ✓

The login form is ready. Would you like me to implement the form validation logic next?
```

---

## Understanding What Happened

Let's break down what just happened:

### 1. Request Reception

You spoke to Orxa (the Engineering Manager). Orxa analyzed your request and determined it needed:
- Planning (create TODO list)
- UI implementation (delegate to frontend)

### 2. TODO Management

Orxa created and tracked the TODO list. This ensures:
- Nothing is forgotten
- Progress is visible
- Completion is verified

### 3. Delegation

Orxa delegated to `@frontend` with a structured prompt including:
- Task description
- Expected outcome
- Required tools
- Must do / must not do
- Context

### 4. Execution

The frontend specialist:
- Read relevant files
- Created the component
- Followed existing patterns
- Provided completion evidence

### 5. Quality Gates

Orxa automatically verified:
- Code quality (lint)
- Type safety (TypeScript)
- Build success

### 6. Memory

Important patterns were extracted and saved (if supermemory is enabled).

---

## Common First-Time Questions

### "Why can't I use grep/glob directly?"

Orxa restricts certain tools to enforce proper delegation. Research tasks (grep/glob) should go to the Plan agent who specializes in research and planning.

**Instead of:**
```
You: Search for all uses of the auth function
```

**Say:**
```
You: Find all uses of the auth function in the codebase
```

Orxa will delegate to the explorer agent.

### "Why did it delegate instead of doing it directly?"

This is the core Orxa pattern! The Orxa orchestrates but doesn't execute. This ensures:
- Specialists handle specialized work
- Better quality through expertise
- Consistent patterns

### "What if I want to change something?"

Just ask! Orxa will:
1. Understand the change
2. Delegate to the appropriate agent
3. Verify the result

### "How do I know which agent was used?"

Look for the `@agentname` prefix in responses. Orxa will also tell you who it's delegating to.

---

## Practice Exercises

Try these to get comfortable:

### Exercise 1: Simple Component

```
Create a button component with primary and secondary variants
```

**Expected:** Delegated to @frontend

### Exercise 2: Code Explanation

```
Explain how the authentication middleware works
```

**Expected:** Delegated to @librarian or @explainer

### Exercise 3: Find Code

```
Find where the user profile is defined in the database schema
```

**Expected:** Delegated to @explorer

### Exercise 4: Validation

```
/validate
```

**Expected:** Invokes @strategist and @reviewer to validate current plan

---

## Tips for Success

### 1. Be Specific

**Vague:**
```
Fix the bug
```

**Specific:**
```
Fix the login error that shows "undefined" instead of the error message
```

### 2. Provide Context

Orxa has limited tool access. Help it by providing:
- File paths when you know them
- Error messages
- What you've already tried

### 3. Let It Delegate

Don't try to force Orxa to do work directly. Trust the delegation pattern — it's designed for quality.

### 4. Use Slash Commands

For common tasks, slash commands are faster:
- `/validate` before starting complex work
- `/explain` to understand code
- `/refactor` for code improvements

### 5. Check TODOs

Orxa tracks TODOs automatically. You can ask:
```
What TODOs are pending?
```

---

## Next Steps

Now that you've had your first experience:

### Learn More

1. 📖 [Understanding Orchestration](understanding-orchestration.md) — Learn how Orxa decides what to delegate
2. 👥 [Meet the Agents](../AGENTS.md) — Full guide to all 15 agents
3. ⚙️ [Configuration Guide](../CONFIGURATION.md) — Customize for your workflow

### Try Advanced Features

1. 🚀 [Orxa Mode](../ORXA-MODE.md) — Parallel execution for complex tasks
2. ✨ [All Features](../FEATURES.md) — Explore everything Orxa can do
3. ⌨️ [Slash Commands](../SLASH-COMMANDS.md) — Master the shortcuts

### Get Help

- 🔧 [Troubleshooting](../TROUBLESHOOTING.md) — Common issues and solutions
- 🏗️ [Architecture](../ARCHITECTURE.md) — How it all works

---

## Quick Reference

### Essential Commands

```bash
orxa doctor          # Check configuration
orxa init            # Run setup wizard
orxa config          # Edit configuration
```

### Essential Configuration

```json
{
  "enabled_agents": ["orxa", "plan", "build", "coder", "frontend"],
  "orxa": {
    "enforcement": {
      "delegation": "warn",
      "todoCompletion": "warn",
      "qualityGates": "warn"
    }
  }
}
```

### Essential Slash Commands

| Command     | Use When            |
| ---------   | ----------          |
| `/validate` | Before complex work |
| `/explain`  | Learning code       |
| `/refactor` | Improving code      |
| `/test`     | Adding tests        |
| `/search`   | Finding code        |

---

**You're now ready to use OpenCode Orxa!** 🎉

Remember: Orxa is your Engineering Manager. Let it manage, delegate, and verify while you focus on what you want to achieve.

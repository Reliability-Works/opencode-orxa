---
name: agent-browser
description: Headless browser automation CLI for web navigation, extraction, and interaction. Use for snapshots, clicks, fills, selectors, and scripted web workflows.
version: 1.0.0
license: Apache-2.0
---

# Browser Automation with agent-browser

Fast CLI for browser automation built for AI agents. Uses a native Rust CLI with a Node.js daemon (Playwright-backed) for persistent sessions.

## Quick start

```bash
agent-browser open https://example.com
agent-browser snapshot -i
agent-browser click @e2
agent-browser fill @e3 "test@example.com"
agent-browser get text @e1
agent-browser screenshot page.png
agent-browser close
```

## Core workflow

1. Open a URL: `agent-browser open <url>`
2. Snapshot: `agent-browser snapshot -i` to get interactive elements (refs)
3. Interact using refs: `click @eN`, `fill @eN "text"`
4. Re-snapshot after navigation/updates
5. Close session when done

## Commands

### Core commands

```bash
agent-browser open <url>              # Navigate to URL (aliases: goto, navigate)
agent-browser click <sel>
agent-browser dblclick <sel>
agent-browser focus <sel>
agent-browser type <sel> <text>
agent-browser fill <sel> <text>
agent-browser press <key>             # alias: key
agent-browser keydown <key>
agent-browser keyup <key>
agent-browser hover <sel>
agent-browser select <sel> <val>
agent-browser check <sel>
agent-browser uncheck <sel>
agent-browser scroll <dir> [px]
agent-browser scrollintoview <sel>    # alias: scrollinto
agent-browser drag <src> <tgt>
agent-browser upload <sel> <files>
agent-browser screenshot [path]       # --full for full page
agent-browser pdf <path>
agent-browser snapshot
agent-browser eval <js>
agent-browser connect <port>
agent-browser close                   # aliases: quit, exit
```

### Get info

```bash
agent-browser get text <sel>
agent-browser get html <sel>
agent-browser get value <sel>
agent-browser get attr <sel> <attr>
agent-browser get title
agent-browser get url
agent-browser get count <sel>
agent-browser get box <sel>
```

### Check state

```bash
agent-browser is visible <sel>
agent-browser is enabled <sel>
agent-browser is checked <sel>
```

### Find elements (semantic locators)

```bash
agent-browser find role <role> <action> [value]
agent-browser find text <text> <action>
agent-browser find label <label> <action> [value]
agent-browser find placeholder <ph> <action> [value]
agent-browser find alt <text> <action>
agent-browser find title <text> <action>
agent-browser find testid <id> <action> [value]
agent-browser find first <sel> <action> [value]
agent-browser find last <sel> <action> [value]
agent-browser find nth <n> <sel> <action> [value]
```

**Actions:** `click`, `fill`, `check`, `hover`, `text`

### Wait

```bash
agent-browser wait <selector>
agent-browser wait <ms>
agent-browser wait --text "Welcome"
agent-browser wait --url "**/dash"
agent-browser wait --load networkidle
agent-browser wait --fn "window.ready === true"
```

### Mouse control

```bash
agent-browser mouse move <x> <y>
agent-browser mouse down [button]
agent-browser mouse up [button]
agent-browser mouse wheel <dy> [dx]
```

### Browser settings

```bash
agent-browser set viewport <w> <h>
agent-browser set device <name>
agent-browser set geo <lat> <lng>
agent-browser set offline [on|off]
agent-browser set headers <json>
agent-browser set credentials <u> <p>
agent-browser set media [dark|light]
```

### Cookies & storage

```bash
agent-browser cookies
agent-browser cookies set <name> <val>
agent-browser cookies clear

agent-browser storage local
agent-browser storage local <key>
agent-browser storage local set <k> <v>
agent-browser storage local clear

agent-browser storage session
```

### Network

```bash
agent-browser network route <url>
agent-browser network route <url> --abort
agent-browser network route <url> --body <json>
agent-browser network unroute [url]
agent-browser network requests
agent-browser network requests --filter api
```

### Tabs & windows

```bash
agent-browser tab
agent-browser tab new [url]
agent-browser tab <n>
agent-browser tab close [n]
agent-browser window new
```

### Frames

```bash
agent-browser frame <sel>
agent-browser frame main
```

### Dialogs

```bash
agent-browser dialog accept [text]
agent-browser dialog dismiss
```

### Debug

```bash
agent-browser trace start [path]
agent-browser trace stop [path]
agent-browser console
agent-browser console --clear
agent-browser errors
agent-browser errors --clear
agent-browser highlight <sel>
agent-browser state save <path>
agent-browser state load <path>
```

### Navigation

```bash
agent-browser back
agent-browser forward
agent-browser reload
```

### Setup

```bash
agent-browser install                 # Download Chromium
agent-browser install --with-deps     # Linux: also install system deps
```

## Snapshot options

```bash
agent-browser snapshot
agent-browser snapshot -i
agent-browser snapshot -c
agent-browser snapshot -d 3
agent-browser snapshot -s "#main"
agent-browser snapshot -i -c -d 5
```

| Option | Description |
|--------|-------------|
| `-i, --interactive` | Only interactive elements (buttons, links, inputs) |
| `-c, --compact` | Remove empty structural elements |
| `-d, --depth <n>` | Limit tree depth |
| `-s, --selector <sel>` | Scope to selector |

## Selectors

### Refs (recommended for AI)

```bash
agent-browser snapshot -i
agent-browser click @e2
agent-browser fill @e3 "test@example.com"
agent-browser get text @e1
```

Refs are deterministic, fast, and align with snapshot output.

### CSS selectors

```bash
agent-browser click "#id"
agent-browser click ".class"
agent-browser click "div > button"
```

### Text & XPath

```bash
agent-browser click "text=Submit"
agent-browser click "xpath=//button"
```

### Semantic locators

```bash
agent-browser find role button click --name "Submit"
agent-browser find label "Email" fill "test@test.com"
```

## Sessions & profiles

```bash
agent-browser --session agent1 open site-a.com
agent-browser --session agent2 open site-b.com
agent-browser session list
agent-browser session
```

Persistent profile example:

```bash
agent-browser --profile ~/.myapp-profile open myapp.com
```

## Best practices

- Use `snapshot -i` (and `--json` if needed) to keep outputs compact.
- Prefer refs (`@eN`) for deterministic interactions.
- Re-snapshot after navigation or dynamic UI updates.
- Use separate `--session` names for parallel browsing workflows.
- When debugging, run `--headed` or use `screenshot --full`.

## References

- Source: https://github.com/vercel-labs/agent-browser
- Install: `npm install -g agent-browser` then `agent-browser install`
- License: Apache-2.0

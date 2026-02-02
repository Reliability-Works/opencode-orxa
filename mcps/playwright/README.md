# Playwright MCP

Model Context Protocol (MCP) server for browser automation using Playwright. Bundled with opencode-orxa plugin.

## Overview

This MCP provides tools for browser automation, allowing agents to:
- Navigate websites and interact with pages
- Take screenshots and capture accessibility snapshots
- Fill forms and click elements
- Execute JavaScript in the browser context
- Manage multiple tabs

## Requirements

- Node.js 18+
- Playwright will auto-install browsers on first use

## Installation

This MCP is bundled with opencode-orxa. No separate installation needed.

## Available Tools

### Navigation

| Tool | Description |
|------|-------------|
| `playwright_browser_navigate` | Navigate to a URL |
| `playwright_browser_navigate_back` | Go back to previous page |
| `playwright_browser_tabs` | List, create, close, or select tabs |

### Interaction

| Tool | Description |
|------|-------------|
| `playwright_browser_click` | Click on an element |
| `playwright_browser_drag` | Drag and drop between elements |
| `playwright_browser_hover` | Hover over an element |
| `playwright_browser_select_option` | Select dropdown options |
| `playwright_browser_fill_form` | Fill multiple form fields |
| `playwright_browser_type` | Type text into an element |
| `playwright_browser_press_key` | Press a keyboard key |
| `playwright_browser_file_upload` | Upload files |

### Inspection

| Tool | Description |
|------|-------------|
| `playwright_browser_snapshot` | Capture accessibility snapshot |
| `playwright_browser_take_screenshot` | Take a screenshot |
| `playwright_browser_evaluate` | Execute JavaScript |
| `playwright_browser_network_requests` | Get network requests |
| `playwright_browser_console_messages` | Get console messages |

### Utilities

| Tool | Description |
|------|-------------|
| `playwright_browser_wait_for` | Wait for conditions |
| `playwright_browser_resize` | Resize browser window |
| `playwright_browser_handle_dialog` | Handle dialogs |
| `playwright_browser_run_code` | Run arbitrary Playwright code |
| `playwright_browser_close` | Close the browser |
| `playwright_browser_install` | Install browsers |

## Usage Examples

### Navigate to a Website

```json
{
  "tool": "playwright_browser_navigate",
  "arguments": {
    "url": "https://example.com"
  }
}
```

### Take a Screenshot

```json
{
  "tool": "playwright_browser_take_screenshot",
  "arguments": {
    "filename": "page.png",
    "fullPage": true
  }
}
```

### Click an Element

```json
{
  "tool": "playwright_browser_click",
  "arguments": {
    "ref": "button#submit",
    "element": "Submit button"
  }
}
```

### Fill a Form

```json
{
  "tool": "playwright_browser_fill_form",
  "arguments": {
    "fields": [
      {
        "name": "Email",
        "ref": "input#email",
        "type": "textbox",
        "value": "user@example.com"
      },
      {
        "name": "Subscribe",
        "ref": "input#subscribe",
        "type": "checkbox",
        "value": "true"
      }
    ]
  }
}
```

### Execute JavaScript

```json
{
  "tool": "playwright_browser_evaluate",
  "arguments": {
    "function": "return document.title"
  }
}
```

### Run Custom Playwright Code

```json
{
  "tool": "playwright_browser_run_code",
  "arguments": {
    "code": "await page.click('.button'); await page.waitForSelector('.success'); return await page.textContent('.message');"
  }
}
```

## Configuration

Add to your `orxa.json`:

```json
{
  "mcps": {
    "playwright": {
      "enabled": true,
      "config": {
        "headless": true,
        "browser": "chromium",
        "viewport": {
          "width": 1280,
          "height": 720
        }
      }
    }
  }
}
```

## Browser Options

The MCP supports three browsers:
- `chromium` (default)
- `firefox`
- `webkit`

Browsers are automatically installed when first used.

## Security Notes

- The `playwright_browser_run_code` tool allows arbitrary JavaScript execution
- Use with caution and only trusted code
- Browser runs in isolated context

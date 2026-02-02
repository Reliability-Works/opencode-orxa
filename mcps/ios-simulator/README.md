# iOS Simulator MCP

Model Context Protocol (MCP) server for iOS Simulator automation. Bundled with opencode-orxa plugin.

## Overview

This MCP provides tools for controlling the iOS Simulator, allowing agents to:
- Take screenshots and record videos
- Interact with the UI (tap, swipe, type)
- Install and launch apps
- Get accessibility information

## Requirements

- macOS with Xcode installed
- iOS Simulator (comes with Xcode)
- Node.js 18+

## Installation

This MCP is bundled with opencode-orxa. No separate installation needed.

## Available Tools

### Device Management

| Tool | Description |
|------|-------------|
| `ios_simulator_get_booted_sim_id` | Get the ID of the currently booted iOS simulator |
| `ios_simulator_open_simulator` | Opens the iOS Simulator application |

### UI Interaction

| Tool | Description |
|------|-------------|
| `ios_simulator_ui_tap` | Tap on the screen at given coordinates |
| `ios_simulator_ui_type` | Input text into the simulator |
| `ios_simulator_ui_swipe` | Swipe on the screen |
| `ios_simulator_ui_describe_point` | Get accessibility info at coordinates |
| `ios_simulator_ui_describe_all` | Describe entire screen accessibility |

### Visual Capture

| Tool | Description |
|------|-------------|
| `ios_simulator_screenshot` | Take a screenshot |
| `ios_simulator_ui_view` | Get compressed screenshot as base64 |
| `ios_simulator_record_video` | Start recording video |
| `ios_simulator_stop_recording` | Stop video recording |

### App Management

| Tool | Description |
|------|-------------|
| `ios_simulator_install_app` | Install an .app or .ipa bundle |
| `ios_simulator_launch_app` | Launch an app by bundle ID |

## Usage Examples

### Take a Screenshot

```json
{
  "tool": "ios_simulator_screenshot",
  "arguments": {
    "output_path": "home-screen.png",
    "type": "png"
  }
}
```

### Tap on Screen

```json
{
  "tool": "ios_simulator_ui_tap",
  "arguments": {
    "x": 100,
    "y": 200
  }
}
```

### Type Text

```json
{
  "tool": "ios_simulator_ui_type",
  "arguments": {
    "text": "Hello World"
  }
}
```

### Launch an App

```json
{
  "tool": "ios_simulator_launch_app",
  "arguments": {
    "bundle_id": "com.apple.mobilesafari",
    "terminate_running": true
  }
}
```

## Configuration

Add to your `orxa.json`:

```json
{
  "mcps": {
    "ios-simulator": {
      "enabled": true,
      "config": {
        "defaultOutputDir": "~/Downloads"
      }
    }
  }
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `IDB_UDID` | Default simulator UDID |
| `IOS_SIMULATOR_MCP_DEFAULT_OUTPUT_DIR` | Default output directory for screenshots/videos |

## Notes

- Some features require newer versions of Xcode
- UI automation uses `simctl io` commands or AppleScript as fallback
- For advanced accessibility features, install `idb` from Facebook

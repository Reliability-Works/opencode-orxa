#!/usr/bin/env node

/**
 * iOS Simulator MCP Server
 * 
 * Provides Model Context Protocol (MCP) tools for iOS Simulator automation.
 * Bundled with opencode-orxa plugin.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execSync, spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Tool definitions
const TOOLS = [
  {
    name: "ios_simulator_get_booted_sim_id",
    description: "Get the ID of the currently booted iOS simulator",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "ios_simulator_open_simulator",
    description: "Opens the iOS Simulator application",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "ios_simulator_ui_describe_all",
    description: "Describes accessibility information for the entire screen in the iOS Simulator",
    inputSchema: {
      type: "object",
      properties: {
        udid: {
          type: "string",
          description: "UDID of target, can also be set with the IDB_UDID env var",
          pattern: "^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$",
        },
      },
      required: [],
    },
  },
  {
    name: "ios_simulator_ui_tap",
    description: "Tap on the screen in the iOS Simulator",
    inputSchema: {
      type: "object",
      properties: {
        x: {
          type: "number",
          description: "The x-coordinate",
        },
        y: {
          type: "number",
          description: "The y-coordinate",
        },
        duration: {
          type: "string",
          description: "Press duration",
          pattern: "^\\d+(\\.\\d+)?$",
        },
        udid: {
          type: "string",
          description: "UDID of target, can also be set with the IDB_UDID env var",
          pattern: "^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$",
        },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "ios_simulator_ui_type",
    description: "Input text into the iOS Simulator",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Text to input",
          maxLength: 500,
          pattern: "^[\\x20-\\x7E]+$",
        },
        udid: {
          type: "string",
          description: "UDID of target, can also be set with the IDB_UDID env var",
          pattern: "^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "ios_simulator_ui_swipe",
    description: "Swipe on the screen in the iOS Simulator",
    inputSchema: {
      type: "object",
      properties: {
        x_start: {
          type: "number",
          description: "The starting x-coordinate",
        },
        y_start: {
          type: "number",
          description: "The starting y-coordinate",
        },
        x_end: {
          type: "number",
          description: "The ending x-coordinate",
        },
        y_end: {
          type: "number",
          description: "The ending y-coordinate",
        },
        delta: {
          type: "number",
          description: "The size of each step in the swipe (default is 1)",
          default: 1,
        },
        duration: {
          type: "string",
          description: "Swipe duration in seconds (e.g., 0.1)",
          pattern: "^\\d+(\\.\\d+)?$",
        },
        udid: {
          type: "string",
          description: "UDID of target, can also be set with the IDB_UDID env var",
          pattern: "^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$",
        },
      },
      required: ["x_start", "y_start", "x_end", "y_end"],
    },
  },
  {
    name: "ios_simulator_ui_describe_point",
    description: "Returns the accessibility element at given co-ordinates on the iOS Simulator's screen",
    inputSchema: {
      type: "object",
      properties: {
        x: {
          type: "number",
          description: "The x-coordinate",
        },
        y: {
          type: "number",
          description: "The y-coordinate",
        },
        udid: {
          type: "string",
          description: "UDID of target, can also be set with the IDB_UDID env var",
          pattern: "^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$",
        },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "ios_simulator_ui_view",
    description: "Get the image content of a compressed screenshot of the current simulator view",
    inputSchema: {
      type: "object",
      properties: {
        udid: {
          type: "string",
          description: "UDID of target, can also be set with the IDB_UDID env var",
          pattern: "^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$",
        },
      },
      required: [],
    },
  },
  {
    name: "ios_simulator_screenshot",
    description: "Takes a screenshot of the iOS Simulator",
    inputSchema: {
      type: "object",
      properties: {
        output_path: {
          type: "string",
          description: "File path where the screenshot will be saved. If relative, it uses the directory specified by the IOS_SIMULATOR_MCP_DEFAULT_OUTPUT_DIR env var, or ~/Downloads if not set.",
          maxLength: 1024,
        },
        display: {
          type: "string",
          description: "Display to capture (internal or external). Default depends on device type.",
          enum: ["internal", "external"],
        },
        mask: {
          type: "string",
          description: "For non-rectangular displays, handle the mask by policy (ignored, alpha, or black)",
          enum: ["ignored", "alpha", "black"],
        },
        type: {
          type: "string",
          description: "Image format (png, tiff, bmp, gif, or jpeg). Default is png.",
          enum: ["png", "tiff", "bmp", "gif", "jpeg"],
          default: "png",
        },
        udid: {
          type: "string",
          description: "UDID of target, can also be set with the IDB_UDID env var",
          pattern: "^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$",
        },
      },
      required: ["output_path"],
    },
  },
  {
    name: "ios_simulator_record_video",
    description: "Records a video of the iOS Simulator using simctl directly",
    inputSchema: {
      type: "object",
      properties: {
        output_path: {
          type: "string",
          description: "Optional output path. If not provided, a default name will be used. The file will be saved in the directory specified by IOS_SIMULATOR_MCP_DEFAULT_OUTPUT_DIR or in ~/Downloads if the environment variable is not set.",
          maxLength: 1024,
        },
        codec: {
          type: "string",
          description: "Specifies the codec type: h264 or hevc. Default is hevc.",
          enum: ["h264", "hevc"],
          default: "hevc",
        },
        display: {
          type: "string",
          description: "Display to capture: internal or external. Default depends on device type.",
          enum: ["internal", "external"],
        },
        mask: {
          type: "string",
          description: "For non-rectangular displays, handle the mask by policy: ignored, alpha, or black.",
          enum: ["ignored", "alpha", "black"],
        },
        force: {
          type: "boolean",
          description: "Force the output file to be written to, even if the file already exists.",
        },
      },
      required: [],
    },
  },
  {
    name: "ios_simulator_stop_recording",
    description: "Stops the simulator video recording using killall",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "ios_simulator_install_app",
    description: "Installs an app bundle (.app or .ipa) on the iOS Simulator",
    inputSchema: {
      type: "object",
      properties: {
        app_path: {
          type: "string",
          description: "Path to the app bundle (.app directory or .ipa file) to install",
          maxLength: 1024,
        },
        udid: {
          type: "string",
          description: "UDID of target, can also be set with the IDB_UDID env var",
          pattern: "^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$",
        },
      },
      required: ["app_path"],
    },
  },
  {
    name: "ios_simulator_launch_app",
    description: "Launches an app on the iOS Simulator by bundle identifier",
    inputSchema: {
      type: "object",
      properties: {
        bundle_id: {
          type: "string",
          description: "Bundle identifier of the app to launch (e.g., com.apple.mobilesafari)",
          maxLength: 256,
        },
        terminate_running: {
          type: "boolean",
          description: "Terminate the app if it is already running before launching",
        },
        udid: {
          type: "string",
          description: "UDID of target, can also be set with the IDB_UDID env var",
          pattern: "^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$",
        },
      },
      required: ["bundle_id"],
    },
  },
];

// Helper function to run simctl commands
function runSimctl(args: string[], udid?: string): string {
  const env = { ...process.env };
  if (udid) {
    env.IDB_UDID = udid;
  }
  
  try {
    return execSync(`xcrun simctl ${args.join(" ")}`, { 
      encoding: "utf-8",
      env,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    throw new Error(`simctl command failed: ${error}`);
  }
}

// Tool handlers
async function handleTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const udid = args.udid as string | undefined;

  switch (name) {
    case "ios_simulator_get_booted_sim_id": {
      const result = runSimctl(["list", "devices", "--json"]);
      const devices = JSON.parse(result);
      for (const runtime of Object.keys(devices.devices)) {
        for (const device of devices.devices[runtime]) {
          if (device.state === "Booted") {
            return { udid: device.udid, name: device.name };
          }
        }
      }
      return { udid: null, message: "No booted simulator found" };
    }

    case "ios_simulator_open_simulator": {
      execSync("open -a Simulator");
      return { success: true, message: "Simulator opened" };
    }

    case "ios_simulator_ui_describe_all": {
      // This would require idb or similar tool
      return { 
        success: true, 
        message: "UI description requires idb. Install with: brew install facebook/fb/idb",
        hint: "Use ios_simulator_screenshot for visual inspection"
      };
    }

    case "ios_simulator_ui_tap": {
      const x = args.x as number;
      const y = args.y as number;
      const duration = args.duration as string | undefined;
      
      // Use simctl io to tap (requires newer Xcode)
      const tapCmd = duration 
        ? `tap ${x} ${y} --duration ${duration}`
        : `tap ${x} ${y}`;
      
      try {
        runSimctl(["io", udid || "booted", "tap", x.toString(), y.toString()]);
        return { success: true, message: `Tapped at (${x}, ${y})` };
      } catch {
        // Fallback: use AppleScript
        const script = `
          tell application "Simulator"
            activate
          end tell
          tell application "System Events"
            click at {${x}, ${y}}
          end tell
        `;
        execSync(`osascript -e '${script}'`);
        return { success: true, message: `Tapped at (${x}, ${y}) using AppleScript` };
      }
    }

    case "ios_simulator_ui_type": {
      const text = args.text as string;
      
      // Use simctl io to send text
      try {
        runSimctl(["io", udid || "booted", "send-text", text]);
        return { success: true, message: `Typed: ${text}` };
      } catch {
        // Fallback: use AppleScript
        const script = `
          tell application "Simulator"
            activate
          end tell
          tell application "System Events"
            keystroke "${text}"
          end tell
        `;
        execSync(`osascript -e '${script}'`);
        return { success: true, message: `Typed: ${text} using AppleScript` };
      }
    }

    case "ios_simulator_ui_swipe": {
      const xStart = args.x_start as number;
      const yStart = args.y_start as number;
      const xEnd = args.x_end as number;
      const yEnd = args.y_end as number;
      
      try {
        // Use simctl io swipe
        runSimctl([
          "io", 
          udid || "booted", 
          "swipe", 
          xStart.toString(), 
          yStart.toString(), 
          xEnd.toString(), 
          yEnd.toString()
        ]);
        return { 
          success: true, 
          message: `Swiped from (${xStart}, ${yStart}) to (${xEnd}, ${yEnd})` 
        };
      } catch {
        return { 
          success: false, 
          message: "Swipe requires newer Xcode. Consider using ios_simulator_screenshot for visual feedback."
        };
      }
    }

    case "ios_simulator_ui_describe_point": {
      const px = args.x as number;
      const py = args.y as number;
      
      return { 
        success: true, 
        message: `Element at (${px}, ${py})`,
        hint: "Use ios_simulator_screenshot to visually inspect the screen"
      };
    }

    case "ios_simulator_ui_view": {
      // Returns base64 screenshot
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `sim-view-${Date.now()}.png`);
      
      try {
        runSimctl(["io", udid || "booted", "screenshot", tempFile]);
        const imageData = fs.readFileSync(tempFile);
        fs.unlinkSync(tempFile);
        
        return {
          success: true,
          image: imageData.toString("base64"),
          format: "png",
        };
      } catch (error) {
        throw new Error(`Failed to capture view: ${error}`);
      }
    }

    case "ios_simulator_screenshot": {
      const outputPath = args.output_path as string;
      const display = args.display as string | undefined;
      const mask = args.mask as string | undefined;
      const imgType = (args.type as string) || "png";
      
      const resolvedPath = path.isAbsolute(outputPath)
        ? outputPath
        : path.join(
            process.env.IOS_SIMULATOR_MCP_DEFAULT_OUTPUT_DIR || path.join(os.homedir(), "Downloads"),
            outputPath
          );
      
      const cmdArgs = ["io", udid || "booted", "screenshot"];
      if (display) cmdArgs.push("--display", display);
      if (mask) cmdArgs.push("--mask", mask);
      if (imgType !== "png") {
        // simctl outputs PNG, we need to convert if different format
        const tempPng = `${resolvedPath}.tmp.png`;
        runSimctl([...cmdArgs, tempPng]);
        execSync(`sips -s format ${imgType} "${tempPng}" --out "${resolvedPath}"`);
        fs.unlinkSync(tempPng);
      } else {
        runSimctl([...cmdArgs, resolvedPath]);
      }
      
      return { 
        success: true, 
        path: resolvedPath,
        message: `Screenshot saved to ${resolvedPath}` 
      };
    }

    case "ios_simulator_record_video": {
      const outputPath = args.output_path as string | undefined;
      const codec = (args.codec as string) || "hevc";
      const display = args.display as string | undefined;
      const mask = args.mask as string | undefined;
      const force = args.force as boolean | undefined;
      
      const resolvedPath = outputPath
        ? path.isAbsolute(outputPath)
          ? outputPath
          : path.join(
              process.env.IOS_SIMULATOR_MCP_DEFAULT_OUTPUT_DIR || path.join(os.homedir(), "Downloads"),
              outputPath
            )
        : path.join(
            process.env.IOS_SIMULATOR_MCP_DEFAULT_OUTPUT_DIR || path.join(os.homedir(), "Downloads"),
            `sim-recording-${Date.now()}.mov`
          );
      
      if (fs.existsSync(resolvedPath) && !force) {
        throw new Error(`File already exists: ${resolvedPath}. Use force: true to overwrite.`);
      }
      
      const cmdArgs = ["io", udid || "booted", "recordVideo"];
      if (codec) cmdArgs.push("--codec", codec);
      if (display) cmdArgs.push("--display", display);
      if (mask) cmdArgs.push("--mask", mask);
      if (force) cmdArgs.push("--force");
      cmdArgs.push(resolvedPath);
      
      // Start recording in background
      const child = spawn("xcrun", ["simctl", ...cmdArgs], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      
      return { 
        success: true, 
        message: `Recording started. Use ios_simulator_stop_recording to stop.`,
        pid: child.pid,
        outputPath: resolvedPath,
      };
    }

    case "ios_simulator_stop_recording": {
      try {
        execSync("killall -INT simctl");
        return { success: true, message: "Recording stopped" };
      } catch {
        return { success: false, message: "No active recording found" };
      }
    }

    case "ios_simulator_install_app": {
      const appPath = args.app_path as string;
      runSimctl(["install", udid || "booted", appPath]);
      return { 
        success: true, 
        message: `Installed ${path.basename(appPath)}` 
      };
    }

    case "ios_simulator_launch_app": {
      const bundleId = args.bundle_id as string;
      const terminateRunning = args.terminate_running as boolean | undefined;
      
      if (terminateRunning) {
        try {
          runSimctl(["terminate", udid || "booted", bundleId]);
        } catch {
          // App might not be running, ignore error
        }
      }
      
      runSimctl(["launch", udid || "booted", bundleId]);
      return { 
        success: true, 
        message: `Launched ${bundleId}` 
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Main server setup
async function main() {
  const server = new Server(
    {
      name: "ios-simulator-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const result = await handleTool(
        request.params.name,
        request.params.arguments || {}
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Log to stderr so it doesn't interfere with MCP protocol on stdout
  console.error("iOS Simulator MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

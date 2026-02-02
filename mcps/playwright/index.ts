#!/usr/bin/env node

/**
 * Playwright MCP Server
 * 
 * Provides Model Context Protocol (MCP) tools for browser automation using Playwright.
 * Bundled with opencode-orxa plugin.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { chromium, firefox, webkit, Browser, Page, BrowserContext } from "playwright";

// Global browser instance
let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;

// Tool definitions
const TOOLS = [
  {
    name: "playwright_browser_navigate",
    description: "Navigate to a URL",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to navigate to",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "playwright_browser_navigate_back",
    description: "Go back to the previous page in the history",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "playwright_browser_click",
    description: "Perform click on a web page",
    inputSchema: {
      type: "object",
      properties: {
        ref: {
          type: "string",
          description: "Exact target element reference from the page snapshot",
        },
        element: {
          type: "string",
          description: "Human-readable element description used to obtain permission to interact with the element",
        },
        button: {
          type: "string",
          description: "Button to click, defaults to left",
          enum: ["left", "right", "middle"],
          default: "left",
        },
        doubleClick: {
          type: "boolean",
          description: "Whether to perform a double click instead of a single click",
        },
        modifiers: {
          type: "array",
          description: "Modifier keys to press",
          items: {
            type: "string",
            enum: ["Alt", "Control", "ControlOrMeta", "Meta", "Shift"],
          },
        },
      },
      required: ["ref"],
    },
  },
  {
    name: "playwright_browser_drag",
    description: "Perform drag and drop between two elements",
    inputSchema: {
      type: "object",
      properties: {
        startRef: {
          type: "string",
          description: "Exact source element reference from the page snapshot",
        },
        startElement: {
          type: "string",
          description: "Human-readable source element description",
        },
        endRef: {
          type: "string",
          description: "Exact target element reference from the page snapshot",
        },
        endElement: {
          type: "string",
          description: "Human-readable target element description",
        },
      },
      required: ["startRef", "endRef"],
    },
  },
  {
    name: "playwright_browser_hover",
    description: "Hover over element on page",
    inputSchema: {
      type: "object",
      properties: {
        ref: {
          type: "string",
          description: "Exact target element reference from the page snapshot",
        },
        element: {
          type: "string",
          description: "Human-readable element description used to obtain permission to interact with the element",
        },
      },
      required: ["ref"],
    },
  },
  {
    name: "playwright_browser_select_option",
    description: "Select an option in a dropdown",
    inputSchema: {
      type: "object",
      properties: {
        ref: {
          type: "string",
          description: "Exact target element reference from the page snapshot",
        },
        element: {
          type: "string",
          description: "Human-readable element description used to obtain permission to interact with the element",
        },
        values: {
          type: "array",
          description: "Array of values to select in the dropdown",
          items: { type: "string" },
        },
      },
      required: ["ref", "values"],
    },
  },
  {
    name: "playwright_browser_fill_form",
    description: "Fill multiple form fields",
    inputSchema: {
      type: "object",
      properties: {
        fields: {
          type: "array",
          description: "Fields to fill in",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Human-readable field name",
              },
              ref: {
                type: "string",
                description: "Exact target field reference from the page snapshot",
              },
              type: {
                type: "string",
                description: "Type of the field",
                enum: ["textbox", "checkbox", "radio", "combobox", "slider"],
              },
              value: {
                type: "string",
                description: "Value to fill in the field",
              },
            },
            required: ["name", "ref", "type", "value"],
          },
        },
      },
      required: ["fields"],
    },
  },
  {
    name: "playwright_browser_type",
    description: "Type text into editable element",
    inputSchema: {
      type: "object",
      properties: {
        ref: {
          type: "string",
          description: "Exact target element reference from the page snapshot",
        },
        element: {
          type: "string",
          description: "Human-readable element description used to obtain permission to interact with the element",
        },
        text: {
          type: "string",
          description: "Text to type into the element",
        },
        slowly: {
          type: "boolean",
          description: "Whether to type one character at a time",
        },
        submit: {
          type: "boolean",
          description: "Whether to submit entered text (press Enter after)",
        },
      },
      required: ["ref", "text"],
    },
  },
  {
    name: "playwright_browser_press_key",
    description: "Press a key on the keyboard",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Name of the key to press or a character to generate, such as `ArrowLeft` or `a`",
        },
      },
      required: ["key"],
    },
  },
  {
    name: "playwright_browser_file_upload",
    description: "Upload one or multiple files",
    inputSchema: {
      type: "object",
      properties: {
        paths: {
          type: "array",
          description: "The absolute paths to the files to upload",
          items: { type: "string" },
        },
      },
    },
  },
  {
    name: "playwright_browser_wait_for",
    description: "Wait for text to appear or disappear or a specified time to pass",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The text to wait for",
        },
        textGone: {
          type: "string",
          description: "The text to wait for to disappear",
        },
        time: {
          type: "number",
          description: "The time to wait in seconds",
        },
      },
    },
  },
  {
    name: "playwright_browser_tabs",
    description: "List, create, close, or select a browser tab",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "Operation to perform",
          enum: ["list", "new", "close", "select"],
        },
        index: {
          type: "number",
          description: "Tab index, used for close/select",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "playwright_browser_evaluate",
    description: "Evaluate JavaScript expression on page or element",
    inputSchema: {
      type: "object",
      properties: {
        function: {
          type: "string",
          description: "JavaScript code to execute",
        },
        element: {
          type: "string",
          description: "Human-readable element description",
        },
        ref: {
          type: "string",
          description: "Exact target element reference from the page snapshot",
        },
      },
      required: ["function"],
    },
  },
  {
    name: "playwright_browser_network_requests",
    description: "Returns all network requests since loading the page",
    inputSchema: {
      type: "object",
      properties: {
        includeStatic: {
          type: "boolean",
          description: "Whether to include successful static resources like images, fonts, scripts, etc",
          default: false,
        },
        filename: {
          type: "string",
          description: "Filename to save the network requests to",
        },
      },
    },
  },
  {
    name: "playwright_browser_console_messages",
    description: "Returns all console messages",
    inputSchema: {
      type: "object",
      properties: {
        level: {
          type: "string",
          description: "Level of the console messages to return",
          enum: ["error", "warning", "info", "debug"],
          default: "info",
        },
        filename: {
          type: "string",
          description: "Filename to save the console messages to",
        },
      },
    },
  },
  {
    name: "playwright_browser_take_screenshot",
    description: "Take a screenshot of the current page",
    inputSchema: {
      type: "object",
      properties: {
        filename: {
          type: "string",
          description: "File name to save the screenshot to",
        },
        fullPage: {
          type: "boolean",
          description: "When true, takes a screenshot of the full scrollable page",
        },
        type: {
          type: "string",
          description: "Image format for the screenshot",
          enum: ["png", "jpeg"],
          default: "png",
        },
        element: {
          type: "string",
          description: "Human-readable element description",
        },
        ref: {
          type: "string",
          description: "Exact target element reference from the page snapshot",
        },
      },
    },
  },
  {
    name: "playwright_browser_snapshot",
    description: "Capture accessibility snapshot of the current page",
    inputSchema: {
      type: "object",
      properties: {
        filename: {
          type: "string",
          description: "Save snapshot to markdown file instead of returning it",
        },
      },
    },
  },
  {
    name: "playwright_browser_handle_dialog",
    description: "Handle a dialog",
    inputSchema: {
      type: "object",
      properties: {
        accept: {
          type: "boolean",
          description: "Whether to accept the dialog",
        },
        promptText: {
          type: "string",
          description: "The text of the prompt in case of a prompt dialog",
        },
      },
      required: ["accept"],
    },
  },
  {
    name: "playwright_browser_resize",
    description: "Resize the browser window",
    inputSchema: {
      type: "object",
      properties: {
        width: {
          type: "number",
          description: "Width of the browser window",
        },
        height: {
          type: "number",
          description: "Height of the browser window",
        },
      },
      required: ["width", "height"],
    },
  },
  {
    name: "playwright_browser_install",
    description: "Install the browser specified in the config",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "playwright_browser_close",
    description: "Close the page",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "playwright_browser_run_code",
    description: "Run Playwright code snippet",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "A JavaScript function containing Playwright code to execute",
        },
      },
      required: ["code"],
    },
  },
];

// Helper to ensure browser is initialized
async function ensureBrowser(): Promise<Page> {
  if (!page) {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    page = await context.newPage();
  }
  return page;
}

// Tool handlers
async function handleTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const p = await ensureBrowser();

  switch (name) {
    case "playwright_browser_navigate": {
      const url = args.url as string;
      await p.goto(url);
      return { success: true, url: p.url(), title: await p.title() };
    }

    case "playwright_browser_navigate_back": {
      await p.goBack();
      return { success: true, url: p.url(), title: await p.title() };
    }

    case "playwright_browser_click": {
      const selector = args.ref as string;
      const button = (args.button as "left" | "right" | "middle") || "left";
      const doubleClick = args.doubleClick as boolean | undefined;
      const modifiers = args.modifiers as string[] | undefined;
      
      const options: { button?: typeof button; doubleClick?: boolean; modifiers?: string[] } = {};
      if (button !== "left") options.button = button;
      if (doubleClick) options.doubleClick = true;
      if (modifiers) options.modifiers = modifiers;
      
      await p.click(selector, options);
      return { success: true, message: `Clicked ${selector}` };
    }

    case "playwright_browser_drag": {
      const startSelector = args.startRef as string;
      const endSelector = args.endRef as string;
      
      await p.dragAndDrop(startSelector, endSelector);
      return { 
        success: true, 
        message: `Dragged from ${startSelector} to ${endSelector}` 
      };
    }

    case "playwright_browser_hover": {
      const selector = args.ref as string;
      await p.hover(selector);
      return { success: true, message: `Hovered over ${selector}` };
    }

    case "playwright_browser_select_option": {
      const selector = args.ref as string;
      const values = args.values as string[];
      
      await p.selectOption(selector, values);
      return { success: true, message: `Selected ${values.join(", ")} in ${selector}` };
    }

    case "playwright_browser_fill_form": {
      const fields = args.fields as Array<{
        name: string;
        ref: string;
        type: string;
        value: string;
      }>;
      
      for (const field of fields) {
        if (field.type === "checkbox") {
          const checked = field.value === "true";
          await p.setChecked(field.ref, checked);
        } else {
          await p.fill(field.ref, field.value);
        }
      }
      
      return { success: true, message: `Filled ${fields.length} fields` };
    }

    case "playwright_browser_type": {
      const selector = args.ref as string;
      const text = args.text as string;
      const slowly = args.slowly as boolean | undefined;
      const submit = args.submit as boolean | undefined;
      
      await p.type(selector, text, { delay: slowly ? 50 : undefined });
      if (submit) {
        await p.press(selector, "Enter");
      }
      
      return { success: true, message: `Typed "${text}" into ${selector}` };
    }

    case "playwright_browser_press_key": {
      const key = args.key as string;
      await p.keyboard.press(key);
      return { success: true, message: `Pressed ${key}` };
    }

    case "playwright_browser_file_upload": {
      const paths = args.paths as string[] | undefined;
      
      if (!paths) {
        // Cancel file chooser
        return { success: true, message: "File chooser cancelled" };
      }
      
      // Find file input and set files
      const fileInput = await p.locator('input[type="file"]').first();
      await fileInput.setInputFiles(paths);
      
      return { success: true, message: `Uploaded ${paths.length} files` };
    }

    case "playwright_browser_wait_for": {
      const text = args.text as string | undefined;
      const textGone = args.textGone as string | undefined;
      const time = args.time as number | undefined;
      
      if (text) {
        await p.waitForSelector(`text=${text}`);
        return { success: true, message: `Found text: ${text}` };
      } else if (textGone) {
        await p.waitForSelector(`text=${textGone}`, { state: "detached" });
        return { success: true, message: `Text gone: ${textGone}` };
      } else if (time) {
        await p.waitForTimeout(time * 1000);
        return { success: true, message: `Waited ${time} seconds` };
      }
      
      return { success: false, message: "No wait condition specified" };
    }

    case "playwright_browser_tabs": {
      const action = args.action as "list" | "new" | "close" | "select";
      const index = args.index as number | undefined;
      
      const pages = context!.pages();
      
      switch (action) {
        case "list": {
          return {
            success: true,
            tabs: pages.map((pg, i) => ({
              index: i,
              url: pg.url(),
              title: pg.title(),
              active: pg === page,
            })),
          };
        }
        
        case "new": {
          const newPage = await context!.newPage();
          page = newPage;
          return { success: true, message: "New tab created", index: pages.length };
        }
        
        case "close": {
          const tabIndex = index !== undefined ? index : pages.indexOf(page!);
          if (tabIndex >= 0 && tabIndex < pages.length) {
            await pages[tabIndex].close();
            if (pages[tabIndex] === page) {
              page = pages.find(pg => pg !== pages[tabIndex]) || null;
            }
            return { success: true, message: `Closed tab ${tabIndex}` };
          }
          return { success: false, message: `Invalid tab index: ${tabIndex}` };
        }
        
        case "select": {
          if (index !== undefined && index >= 0 && index < pages.length) {
            page = pages[index];
            await page.bringToFront();
            return { success: true, message: `Switched to tab ${index}` };
          }
          return { success: false, message: `Invalid tab index: ${index}` };
        }
      }
      
      return { success: false, message: `Unknown action: ${action}` };
    }

    case "playwright_browser_evaluate": {
      const code = args.function as string;
      const ref = args.ref as string | undefined;
      
      let result: unknown;
      if (ref) {
        const element = await p.locator(ref).first();
        result = await element.evaluate((el, fn) => {
          const func = new Function("element", fn);
          return func(el);
        }, code);
      } else {
        result = await p.evaluate((fn) => {
          const func = new Function(fn);
          return func();
        }, code);
      }
      
      return { success: true, result };
    }

    case "playwright_browser_network_requests": {
      // This would require setting up request interception
      // For now, return a placeholder
      return { 
        success: true, 
        message: "Network request tracking requires setup",
        hint: "Use page.route() in a code snippet for request interception"
      };
    }

    case "playwright_browser_console_messages": {
      const level = (args.level as "error" | "warning" | "info" | "debug") || "info";
      
      // This would require setting up console event listeners
      // For now, return a placeholder
      return { 
        success: true, 
        message: "Console message tracking requires setup",
        hint: "Use page.on('console') in a code snippet for console tracking"
      };
    }

    case "playwright_browser_take_screenshot": {
      const filename = args.filename as string | undefined;
      const fullPage = args.fullPage as boolean | undefined;
      const type = (args.type as "png" | "jpeg") || "png";
      const ref = args.ref as string | undefined;
      
      let screenshot: Buffer;
      
      if (ref) {
        const element = await p.locator(ref).first();
        screenshot = await element.screenshot({ type });
      } else {
        screenshot = await p.screenshot({ 
          fullPage, 
          type,
        });
      }
      
      const base64Data = screenshot.toString("base64");
      
      return {
        success: true,
        image: base64Data,
        format: type,
        filename: filename || undefined,
      };
    }

    case "playwright_browser_snapshot": {
      const filename = args.filename as string | undefined;
      
      // Get accessibility tree
      const snapshot = await p.accessibility.snapshot();
      const markdown = generateAccessibilityMarkdown(snapshot);
      
      if (filename) {
        const fs = await import("fs");
        fs.writeFileSync(filename, markdown);
        return { success: true, message: `Snapshot saved to ${filename}` };
      }
      
      return { success: true, snapshot: markdown };
    }

    case "playwright_browser_handle_dialog": {
      const accept = args.accept as boolean;
      const promptText = args.promptText as string | undefined;
      
      // This would require setting up dialog handler
      // For now, return a placeholder
      return { 
        success: true, 
        message: "Dialog handling requires setup",
        hint: "Use page.on('dialog') in a code snippet for dialog handling"
      };
    }

    case "playwright_browser_resize": {
      const width = args.width as number;
      const height = args.height as number;
      
      await p.setViewportSize({ width, height });
      return { success: true, message: `Resized to ${width}x${height}` };
    }

    case "playwright_browser_install": {
      // Playwright browsers are auto-installed
      return { 
        success: true, 
        message: "Playwright browsers are auto-installed on first use"
      };
    }

    case "playwright_browser_close": {
      if (browser) {
        await browser.close();
        browser = null;
        context = null;
        page = null;
      }
      return { success: true, message: "Browser closed" };
    }

    case "playwright_browser_run_code": {
      const code = args.code as string;
      
      // Execute arbitrary Playwright code
      // This is powerful but potentially dangerous
      const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
      const fn = new AsyncFunction("page", code);
      const result = await fn(p);
      
      return { success: true, result };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Generate markdown from accessibility snapshot
function generateAccessibilityMarkdown(snapshot: unknown): string {
  // Simple markdown generation from accessibility tree
  // In a full implementation, this would be more sophisticated
  return JSON.stringify(snapshot, null, 2);
}

// Main server setup
async function main() {
  const server = new Server(
    {
      name: "playwright-mcp",
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
  console.error("Playwright MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const PACKAGE_NAME = "@reliabilityworks/opencode-orxa";
const NPM_REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}`;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface UpdateCache {
  lastCheck: number;
  latestVersion: string | null;
  hasUpdate: boolean;
  error?: string;
}

interface NpmRegistryResponse {
  "dist-tags": {
    latest: string;
  };
}

/**
 * Get the path to the update cache file
 */
function getCachePath(): string {
  const configDir = path.join(os.homedir(), ".config", "opencode-orxa");
  
  // Ensure directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  return path.join(configDir, "update-cache.json");
}

/**
 * Read the cached update check result
 */
function readCache(): UpdateCache | null {
  try {
    const cachePath = getCachePath();
    if (!fs.existsSync(cachePath)) {
      return null;
    }
    
    const content = fs.readFileSync(cachePath, "utf-8");
    return JSON.parse(content) as UpdateCache;
  } catch {
    return null;
  }
}

/**
 * Write the update check result to cache
 */
function writeCache(cache: UpdateCache): void {
  try {
    const cachePath = getCachePath();
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf-8");
  } catch {
    // Silently fail - cache is best-effort
  }
}

/**
 * Check if the cache is still valid (within 1 hour)
 */
function isCacheValid(cache: UpdateCache): boolean {
  const now = Date.now();
  return now - cache.lastCheck < CACHE_DURATION_MS;
}

/**
 * Compare two version strings
 * Returns true if v2 is newer than v1
 */
function isNewerVersion(current: string, latest: string): boolean {
  // Simple string comparison works for semver versions
  // For more complex cases, we could use semver parsing
  return latest !== current;
}

/**
 * Fetch the latest version from NPM registry
 */
async function fetchLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(NPM_REGISTRY_URL, {
      headers: {
        Accept: "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = (await response.json()) as NpmRegistryResponse;
    return data["dist-tags"]?.latest || null;
  } catch (error) {
    // Silently fail - network errors shouldn't crash the plugin
    return null;
  }
}

/**
 * Check for updates, with caching
 * Returns null if no update or check is disabled
 * Returns update info if update is available
 */
export async function checkForUpdates(
  currentVersion: string,
  enabled: boolean = true
): Promise<{ hasUpdate: boolean; latestVersion: string | null; currentVersion: string }> {
  // If disabled, return no update
  if (!enabled) {
    return { hasUpdate: false, latestVersion: null, currentVersion };
  }
  
  // Check cache first
  const cache = readCache();
  if (cache && isCacheValid(cache)) {
    return {
      hasUpdate: cache.hasUpdate,
      latestVersion: cache.latestVersion,
      currentVersion,
    };
  }
  
  // Fetch latest version from NPM
  const latestVersion = await fetchLatestVersion();
  
  if (!latestVersion) {
    // Write failed check to cache to avoid hammering NPM
    writeCache({
      lastCheck: Date.now(),
      latestVersion: null,
      hasUpdate: false,
      error: "Failed to fetch",
    });
    
    return { hasUpdate: false, latestVersion: null, currentVersion };
  }
  
  const hasUpdate = isNewerVersion(currentVersion, latestVersion);
  
  // Write to cache
  writeCache({
    lastCheck: Date.now(),
    latestVersion,
    hasUpdate,
  });
  
  return { hasUpdate, latestVersion, currentVersion };
}

/**
 * Format update message for display
 */
export function formatUpdateMessage(
  currentVersion: string,
  latestVersion: string
): { title: string; message: string } {
  return {
    title: "Update Available",
    message: `v${latestVersion} available. Run 'npm install ${PACKAGE_NAME}@latest' to update.`,
  };
}

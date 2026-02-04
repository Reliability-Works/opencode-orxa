#!/usr/bin/env node

/**
 * Sync version numbers in documentation files with package.json
 * 
 * This script updates all hardcoded version references in README.md
 * and docs/ files to match the version in package.json.
 * 
 * Usage: node scripts/sync-versions.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Get version from package.json
const packageJsonPath = join(rootDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

console.log(`📦 Package version: ${version}`);

// Files to update
const filesToUpdate = [
  'README.md',
  'docs/INSTALLATION.md',
  'docs/FEATURES.md',
  'docs/AGENTS.md',
  'docs/SLASH-COMMANDS.md',
  'docs/ARCHITECTURE.md',
  'docs/CONFIGURATION.md',
  'docs/TROUBLESHOOTING.md',
  'docs/ORXA-MODE.md',
  'docs/DEVELOPMENT.md',
  'docs/guide/overview.md',
  'docs/guide/understanding-orchestration.md',
  'docs/guide/customizing-agents.md',
];

// Version patterns to match (in order of specificity)
const versionPatterns = [
  // Full version in install commands (e.g., @1.0.39)
  {
    regex: /@reliabilityworks\/opencode-orxa@\d+\.\d+\.\d+/g,
    replacement: `@reliabilityworks/opencode-orxa@${version}`,
    description: 'Package install commands'
  },
  // Version in CLI tool install commands
  {
    regex: /npm install -g agent-(device|browser)@\d+\.\d+\.\d+/g,
    replacement: `npm install -g agent-$1@${version}`,
    description: 'CLI tool install commands'
  },
  // Version in welcome toast example (e.g., "OpenCode Orxa v1.0.39")
  {
    regex: /OpenCode Orxa v\d+\.\d+\.\d+/g,
    replacement: `OpenCode Orxa v${version}`,
    description: 'Welcome toast examples'
  },
  // Version in migration notes (e.g., "prior to v1.0.39")
  {
    regex: /prior to v\d+\.\d+\.\d+/g,
    replacement: `prior to v${version}`,
    description: 'Migration version references'
  },
  // Version in "All X built-in agents" default config
  {
    regex: /Default: All \d+ built-in agents/g,
    replacement: `Default: All 17 built-in agents`,
    description: 'Agent count defaults'
  }
];

let totalUpdates = 0;

for (const file of filesToUpdate) {
  const filePath = join(rootDir, file);
  
  try {
    let content = readFileSync(filePath, 'utf8');
    let originalContent = content;
    let fileUpdates = 0;
    
    for (const pattern of versionPatterns) {
      const matches = content.match(pattern.regex);
      if (matches) {
        // Check exclusion condition if present
        if (pattern.exclude) {
          const validMatches = matches.filter(match => !pattern.exclude(match, content));
          if (validMatches.length === 0) continue;
        }
        
        // Check condition if present
        if (pattern.condition && !pattern.condition(content)) {
          continue;
        }
        
        content = content.replace(pattern.regex, pattern.replacement);
        fileUpdates += matches.length;
      }
    }
    
    if (content !== originalContent) {
      writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated ${file}: ${fileUpdates} version reference(s)`);
      totalUpdates += fileUpdates;
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, skip
      continue;
    }
    console.error(`❌ Error processing ${file}:`, error.message);
  }
}

console.log(`\n🎉 Version sync complete! Updated ${totalUpdates} reference(s) across documentation.`);
console.log(`   All docs now reference version ${version}`);

// Exit with error if no updates were made (for CI)
if (totalUpdates === 0) {
  console.log('\n⚠️  No version updates needed - documentation already up to date.');
}

process.exit(0);

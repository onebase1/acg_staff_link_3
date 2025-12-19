#!/usr/bin/env node
/**
 * SYNC REGISTRY → LINEAR
 * 
 * Purpose: When module status changes in MODULE_REGISTRY.json, 
 *          this script outputs the Linear MCP command to sync.
 * 
 * What "sync" means:
 * - NOT an API call (we don't have direct Linear API access from scripts)
 * - OUTPUTS the exact Linear MCP command for the agent to execute
 * - Keeps both systems in agreement (Registry = source of metadata, Linear = source of status)
 * 
 * Usage:
 *   node scripts/sync-registry-to-linear.mjs --module 32
 *   node scripts/sync-registry-to-linear.mjs --all
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.join(__dirname, '..', 'MODULE_REGISTRY.json');

// Status mapping: Registry → Linear
const STATUS_MAP = {
  'planned': 'Backlog',
  'in_progress': 'In Progress',
  'in_review': 'In Review',
  'completed': 'Done',
  'blocked': 'Blocked',
  'archived': 'Canceled'
};

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error('❌ MODULE_REGISTRY.json not found. Run create-module.mjs first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
}

function syncModule(registry, moduleNumber) {
  const module = registry.modules[moduleNumber];
  
  if (!module) {
    console.error(`❌ MODULE ${moduleNumber} not found in registry`);
    return null;
  }
  
  const linearState = STATUS_MAP[module.status] || 'Backlog';
  
  console.log(`\n📤 MODULE ${moduleNumber}: ${module.name}`);
  console.log(`   Registry Status: ${module.status}`);
  console.log(`   Linear State:    ${linearState}`);
  
  if (module.linearIssueId) {
    console.log(`   Linear Issue:    ${module.linearIssueId}`);
    console.log(`\n💡 Execute this Linear MCP command:`);
    console.log(`   linear("Update issue ${module.linearIssueId} state to ${linearState}")`);
    return {
      moduleNumber,
      linearIssueId: module.linearIssueId,
      command: `Update issue ${module.linearIssueId} state to ${linearState}`
    };
  } else {
    console.log(`   ⚠️  No Linear issue linked. Create one first with sync-to-linear.mjs`);
    return null;
  }
}

function main() {
  const args = process.argv.slice(2);
  const registry = loadRegistry();
  
  if (args.includes('--all')) {
    console.log('🔄 Syncing ALL modules to Linear...\n');
    const commands = [];
    
    Object.keys(registry.modules).forEach(num => {
      const result = syncModule(registry, num);
      if (result) commands.push(result);
    });
    
    if (commands.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('📋 BATCH LINEAR COMMANDS (copy & execute):');
      console.log('='.repeat(60));
      commands.forEach(cmd => {
        console.log(`linear("${cmd.command}")`);
      });
    } else {
      console.log('\n⚠️  No modules have Linear issues linked.');
    }
  } else if (args.includes('--module')) {
    const moduleNumber = args[args.indexOf('--module') + 1];
    if (!moduleNumber) {
      console.error('Usage: node sync-registry-to-linear.mjs --module 32');
      process.exit(1);
    }
    syncModule(registry, moduleNumber);
  } else {
    console.log('Usage:');
    console.log('  node sync-registry-to-linear.mjs --module 32  # Sync one module');
    console.log('  node sync-registry-to-linear.mjs --all         # Sync all modules');
    process.exit(0);
  }
}

main();


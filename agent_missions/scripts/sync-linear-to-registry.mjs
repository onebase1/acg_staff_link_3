#!/usr/bin/env node
/**
 * SYNC LINEAR → REGISTRY
 * 
 * Purpose: When issue status changes in Linear (human moves ticket),
 *          this script updates MODULE_REGISTRY.json to match.
 * 
 * What "sync" means:
 * - Agent queries Linear: linear("Get issue AUT-XX status")
 * - Agent runs this script with the status
 * - Script updates registry to match Linear
 * - Both systems now agree
 * 
 * Rule: LINEAR IS SOURCE OF TRUTH FOR STATUS
 *       REGISTRY IS SOURCE OF TRUTH FOR METADATA
 * 
 * Usage:
 *   node scripts/sync-linear-to-registry.mjs --issue AUT-32 --status "In Progress"
 *   node scripts/sync-linear-to-registry.mjs --issue AUT-32 --status Done
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.join(__dirname, '..', 'MODULE_REGISTRY.json');

// Status mapping: Linear → Registry
const STATUS_MAP = {
  'Backlog': 'planned',
  'Todo': 'planned',
  'In Progress': 'in_progress',
  'In Review': 'in_review',
  'Done': 'completed',
  'Blocked': 'blocked',
  'Canceled': 'archived',
  'Cancelled': 'archived'
};

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error('❌ MODULE_REGISTRY.json not found.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
}

function saveRegistry(registry) {
  registry.lastUpdated = new Date().toISOString();
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

function syncLinearToRegistry(linearIssueId, linearStatus) {
  const registry = loadRegistry();
  
  // Find module by Linear issue ID
  const moduleEntry = Object.entries(registry.modules).find(
    ([num, mod]) => mod.linearIssueId === linearIssueId
  );
  
  if (!moduleEntry) {
    console.error(`❌ No module found linked to Linear issue ${linearIssueId}`);
    console.log('\n💡 To link a module to Linear:');
    console.log(`   1. Edit MODULE_REGISTRY.json`);
    console.log(`   2. Add "linearIssueId": "${linearIssueId}" to the module`);
    process.exit(1);
  }
  
  const [moduleNumber, module] = moduleEntry;
  const registryStatus = STATUS_MAP[linearStatus];
  
  if (!registryStatus) {
    console.error(`❌ Unknown Linear status: "${linearStatus}"`);
    console.log('\n📋 Valid Linear statuses:');
    Object.keys(STATUS_MAP).forEach(s => console.log(`   - ${s}`));
    process.exit(1);
  }
  
  const oldStatus = module.status;
  
  // Update registry
  module.status = registryStatus;
  module.lastModifiedBy = 'Linear Sync';
  module.lastModifiedAt = new Date().toISOString();
  
  if (registryStatus === 'completed' && !module.completedAt) {
    module.completedAt = new Date().toISOString();
  }
  
  saveRegistry(registry);
  
  console.log(`✅ MODULE ${moduleNumber} synced from Linear`);
  console.log(`   Name:       ${module.name}`);
  console.log(`   Linear:     ${linearIssueId}`);
  console.log(`   Old Status: ${oldStatus}`);
  console.log(`   New Status: ${registryStatus}`);
}

function main() {
  const args = process.argv.slice(2);
  
  const issueIndex = args.indexOf('--issue');
  const statusIndex = args.indexOf('--status');
  
  if (issueIndex === -1 || statusIndex === -1) {
    console.log('Usage:');
    console.log('  node sync-linear-to-registry.mjs --issue AUT-32 --status "In Progress"');
    console.log('  node sync-linear-to-registry.mjs --issue AUT-32 --status Done');
    console.log('\nValid statuses: Backlog, Todo, In Progress, In Review, Done, Blocked, Canceled');
    process.exit(0);
  }
  
  const linearIssueId = args[issueIndex + 1];
  const linearStatus = args[statusIndex + 1];
  
  if (!linearIssueId || !linearStatus) {
    console.error('❌ Both --issue and --status are required');
    process.exit(1);
  }
  
  syncLinearToRegistry(linearIssueId, linearStatus);
}

main();


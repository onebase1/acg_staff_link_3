#!/usr/bin/env node
/**
 * ROLLBACK MODULE
 * 
 * Purpose: Display (and optionally execute) rollback steps for a module.
 *          Every module MUST have a rollback plan in the registry.
 * 
 * Usage:
 *   node scripts/rollback-module.mjs --module 32           # Show rollback plan
 *   node scripts/rollback-module.mjs --module 32 --execute # Execute rollback commands
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.join(__dirname, '..', 'MODULE_REGISTRY.json');

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error('❌ MODULE_REGISTRY.json not found.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
}

function rollbackModule(moduleNumber, execute = false) {
  const registry = loadRegistry();
  const module = registry.modules[moduleNumber];
  
  if (!module) {
    console.error(`❌ MODULE ${moduleNumber} not found in registry`);
    process.exit(1);
  }
  
  if (!module.rollback) {
    console.error(`❌ No rollback plan defined for MODULE ${moduleNumber}`);
    console.log('\n💡 Add a rollback plan to MODULE_REGISTRY.json:');
    console.log(`   "rollback": {`);
    console.log(`     "type": "git_revert",`);
    console.log(`     "commands": ["git revert <commit>", "npm run deploy"],`);
    console.log(`     "affectedFiles": ["path/to/file.ts"],`);
    console.log(`     "testAfterRollback": ["npm test"],`);
    console.log(`     "notes": "Description of rollback impact"`);
    console.log(`   }`);
    process.exit(1);
  }
  
  const { rollback } = module;
  
  console.log('⚠️ '.repeat(20));
  console.log(`\n🔙 ROLLBACK MODULE ${moduleNumber}: ${module.name}\n`);
  console.log('⚠️ '.repeat(20));
  
  console.log('\n📋 ROLLBACK TYPE:', rollback.type || 'manual');
  
  if (rollback.commands && rollback.commands.length > 0) {
    console.log('\n📋 COMMANDS TO EXECUTE:');
    rollback.commands.forEach((cmd, i) => {
      console.log(`   ${i + 1}. ${cmd}`);
    });
  }
  
  if (rollback.affectedFiles && rollback.affectedFiles.length > 0) {
    console.log('\n📁 AFFECTED FILES:');
    rollback.affectedFiles.forEach(file => {
      console.log(`   - ${file}`);
    });
  }
  
  if (rollback.testAfterRollback && rollback.testAfterRollback.length > 0) {
    console.log('\n✅ TEST AFTER ROLLBACK:');
    rollback.testAfterRollback.forEach(test => {
      console.log(`   - ${test}`);
    });
  }
  
  if (rollback.dataRollback) {
    console.log('\n⚠️  DATA ROLLBACK REQUIRED:');
    console.log(`   ${rollback.dataRollback}`);
  }
  
  if (rollback.notes) {
    console.log('\n📝 NOTES:', rollback.notes);
  }
  
  if (!execute) {
    console.log('\n' + '-'.repeat(60));
    console.log('⚠️  DRY RUN - No changes made');
    console.log('   Add --execute flag to run the rollback commands');
    console.log('-'.repeat(60));
    return;
  }
  
  // Execute rollback
  console.log('\n🚀 EXECUTING ROLLBACK...\n');
  
  for (const cmd of rollback.commands) {
    console.log(`$ ${cmd}`);
    try {
      execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..', '..') });
      console.log('   ✅ Success\n');
    } catch (err) {
      console.error(`   ❌ FAILED: ${err.message}`);
      console.log('\n⚠️  Rollback partially completed. Manual intervention may be required.');
      process.exit(1);
    }
  }
  
  console.log('✅ ROLLBACK COMPLETE');
  console.log('\n📋 Next steps:');
  console.log('   1. Run the test commands above');
  console.log('   2. Verify the application works correctly');
  console.log('   3. Update module status if needed');
}

function main() {
  const args = process.argv.slice(2);
  const moduleIndex = args.indexOf('--module');
  
  if (moduleIndex === -1) {
    console.log('Usage:');
    console.log('  node rollback-module.mjs --module 32           # Show rollback plan');
    console.log('  node rollback-module.mjs --module 32 --execute # Execute rollback');
    process.exit(0);
  }
  
  const moduleNumber = args[moduleIndex + 1];
  const execute = args.includes('--execute');
  
  if (!moduleNumber) {
    console.error('❌ Module number required');
    process.exit(1);
  }
  
  rollbackModule(moduleNumber, execute);
}

main();


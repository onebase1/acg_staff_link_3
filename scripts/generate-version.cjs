#!/usr/bin/env node

/**
 * 📦 VERSION FILE GENERATOR
 *
 * Generates version.json file during build process.
 * This file is used by the app to detect when a new version is deployed.
 *
 * The version is based on:
 * - Git commit SHA (short)
 * - Build timestamp
 * - Package.json version (optional)
 *
 * Run this script before building:
 * node scripts/generate-version.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get git commit hash (short version)
function getGitCommitHash() {
  try {
    const hash = execSync('git rev-parse --short HEAD')
      .toString()
      .trim();
    return hash;
  } catch (error) {
    console.warn('⚠️  Could not get git commit hash:', error.message);
    return 'unknown';
  }
}

// Get git branch name
function getGitBranch() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD')
      .toString()
      .trim();
    return branch;
  } catch (error) {
    return 'unknown';
  }
}

// Get package.json version
function getPackageVersion() {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
    );
    return packageJson.version || '1.0.0';
  } catch (error) {
    return '1.0.0';
  }
}

// Generate version info
function generateVersion() {
  const commitHash = getGitCommitHash();
  const branch = getGitBranch();
  const packageVersion = getPackageVersion();
  const buildTime = new Date().toISOString();

  // Version format: packageVersion-commitHash (e.g., 1.0.0-abc123)
  const version = `${packageVersion}-${commitHash}`;

  const versionInfo = {
    version,
    commitHash,
    branch,
    packageVersion,
    buildTime,
    buildTimestamp: Date.now()
  };

  return versionInfo;
}

// Write version.json to public directory
function writeVersionFile() {
  const versionInfo = generateVersion();

  // Write to public directory (gets copied to dist during build)
  const publicDir = path.join(__dirname, '..', 'public');
  const versionPath = path.join(publicDir, 'version.json');

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(
    versionPath,
    JSON.stringify(versionInfo, null, 2)
  );

  console.log('✅ Generated version.json:');
  console.log(JSON.stringify(versionInfo, null, 2));

  // Also create .env.local with version for import.meta.env
  const envPath = path.join(__dirname, '..', '.env.local');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Remove existing VITE_APP_VERSION line
  envContent = envContent
    .split('\n')
    .filter(line => !line.startsWith('VITE_APP_VERSION='))
    .join('\n');

  // Add new version
  envContent += `\nVITE_APP_VERSION=${versionInfo.version}\n`;

  fs.writeFileSync(envPath, envContent.trim() + '\n');

  console.log(`✅ Updated .env.local with VITE_APP_VERSION=${versionInfo.version}`);
}

// Run if called directly
if (require.main === module) {
  try {
    writeVersionFile();
  } catch (error) {
    console.error('❌ Error generating version file:', error);
    process.exit(1);
  }
}

module.exports = { generateVersion, writeVersionFile };

# .gitignore Update - Security Fix

**Date:** 2026-01-16
**Issue:** n8n-workflows/n8n-MASTER/ folder contains sensitive API keys

## ✅ Changes Applied

Added to `.gitignore`:
```
# n8n workflows with sensitive data (API keys, credentials)
n8n-workflows/n8n-MASTER/
n8n-workflows/**/*credentials*.json
n8n-workflows/**/*secret*.json
n8n-workflows/**/*api-key*.json
```

## 🔍 Files Protected

- `n8n-workflows/n8n-MASTER/.mcp.json` - Contains MCP server credentials
- Any credential/secret/API key JSON files in n8n-workflows

## ✅ Verification

The folder was **NOT previously tracked** by git, so no sensitive data was committed.

**Status:** Protected ✅

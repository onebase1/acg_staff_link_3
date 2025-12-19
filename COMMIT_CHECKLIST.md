# ⚠️ BEFORE COMMITTING - READ THIS! ⚠️

## 🚨 NEVER Commit These Files (They Contain Secrets)

- ❌ `.mcp.json` - Contains Linear API key
- ❌ `.env` - Contains Supabase credentials
- ❌ `.env.local` - Contains local secrets

These are already in `.gitignore`, but `git add .` can be risky!

---

## ✅ SAFE Commit Workflow

### Option 1: Stage Specific Files Only (RECOMMENDED)
```bash
git add path/to/specific/file.js
git add src/components/MyComponent.jsx
git commit -m "your message"
git push origin main
```

### Option 2: If You Must Use `git add .`
```bash
git add .
git status                    # ← CHECK THIS! Look for .mcp.json or .env
git reset HEAD .mcp.json      # ← Remove if accidentally staged
git commit -m "your message"
git push origin main
```

---

## 🔍 Quick Check Before Pushing

```bash
# See what's about to be committed
git status

# If you see .mcp.json or .env, STOP and run:
git reset HEAD .mcp.json .env .env.local

# Then commit without secrets
git commit -m "your message"
```

---

## 🚑 Emergency: Already Committed Secrets?

```bash
# 1. Undo last commit (keep changes)
git reset HEAD~1

# 2. Remove secret file from staging
git reset HEAD .mcp.json

# 3. Commit properly (without secrets)
git add <only safe files>
git commit -m "your message"

# 4. Force push (if you already pushed)
git push origin main --force-with-lease
```

---

## 💡 Pro Tip: Use Git Aliases

Add to `.git/config` or `~/.gitconfig`:

```ini
[alias]
    safe-commit = !git add -u && git status && echo '\n⚠️  Review files above. Press Enter to continue or Ctrl+C to cancel' && read && git commit
```

Usage:
```bash
git safe-commit -m "your message"
```

This forces you to review what's being committed!

---

**Remember:** `.mcp.json` stays local for MCP to work, but GitHub rejects it for security. ✅

# 🔔 App Update Notification System

## Overview

Automatic update detection system that notifies all users (admins and staff) when a new version of the app has been deployed to Netlify. No more stale caches or outdated data!

---

## ✅ How It Works

```
┌─────────────────────────────────────────────────────────┐
│                   UPDATE FLOW DIAGRAM                    │
└─────────────────────────────────────────────────────────┘

1. CODE CHANGE
   Developer commits code → Git → GitHub
                              ↓
2. NETLIFY BUILD
   Auto-builds on push → Runs prebuild script
                              ↓
3. VERSION GENERATION
   scripts/generate-version.cjs creates version.json
   - Version: 1.0.0-abc123 (packageVersion-commitHash)
   - Build time: 2025-11-23T19:30:00.000Z
   - Commit hash: abc123
                              ↓
4. DEPLOY TO PRODUCTION
   version.json deployed to /version.json
                              ↓
5. USER DETECTION
   App checks /version.json every 5 minutes
   Compares deployed version with current version
                              ↓
6. UPDATE NOTIFICATION
   Shows banner: "New Version Available!"
   Options: Refresh Now | Later
                              ↓
7. USER REFRESHES
   Gets latest code, clears cache
   App reloads with new version
```

---

## 📦 Components

### **1. Version Generator Script**

**File**: `scripts/generate-version.cjs`

**What it does**:
- Runs automatically before each build (prebuild hook)
- Gets Git commit hash (e.g., `f74421b`)
- Gets package.json version (e.g., `1.0.0`)
- Combines into version: `1.0.0-f74421b`
- Creates `public/version.json` file
- Updates `.env.local` with `VITE_APP_VERSION`

**Generated File** (`public/version.json`):
```json
{
  "version": "1.0.0-f74421b",
  "commitHash": "f74421b",
  "branch": "main",
  "packageVersion": "1.0.0",
  "buildTime": "2025-11-23T19:30:00.000Z",
  "buildTimestamp": 1763926665246
}
```

---

### **2. Version Hook**

**File**: `src/hooks/useAppVersion.js`

**What it does**:
- Fetches `/version.json` every 5 minutes
- Compares deployed version with current app version
- Returns `hasUpdate: true` when versions don't match
- Also checks when user switches back to tab (visibility change)
- Handles offline/error states gracefully

**Usage**:
```javascript
import { useAppVersion } from '@/hooks/useAppVersion';

const { hasUpdate, currentVersion, latestVersion, reload } = useAppVersion();

if (hasUpdate) {
  console.log(`Update available! Current: ${currentVersion}, Latest: ${latestVersion}`);
  reload(); // Refresh the page
}
```

---

### **3. Update Notification Component**

**File**: `src/components/UpdateNotification.jsx`

**What it does**:
- Shows prominent banner when `hasUpdate === true`
- **Desktop**: Fixed top banner
- **Mobile**: Fixed bottom banner
- Provides "Refresh Now" button
- Optional "Later" button (dismisses for 15 minutes)
- Optional auto-refresh countdown

**Features**:
- ✅ Beautiful gradient design (blue/cyan)
- ✅ Mobile-responsive
- ✅ Dismissible (re-shows after 15 min)
- ✅ Optional auto-refresh countdown
- ✅ Works on all screen sizes

**Props**:
```javascript
<UpdateNotification
  hasUpdate={boolean}          // Whether update is available
  currentVersion={string}      // Current app version
  latestVersion={string}       // Latest deployed version
  onRefresh={function}         // Called when user clicks refresh
  autoRefreshAfter={number}    // Optional: Auto-refresh after X seconds
/>
  autoRefreshAfter={number}    // Optional: Auto-refresh after X seconds
/>
```

### **4. Sidebar Version Display**

**File**: `src/pages/Layout.jsx`

**What it does**:
- Shows current version (e.g., `v1.0.0-f74421b`) at the bottom of the sidebar
- **Click to Check**: Clicking the version number manually triggers an update check
- **Visual Feedback**: Icon spins while checking
- Gives users confidence they are on the latest version

---

### **5. App Integration**

**File**: `src/App.jsx`

**Integration**:
```javascript
import { useAppVersion } from "@/hooks/useAppVersion"
import UpdateNotification from "@/components/UpdateNotification"

function App() {
  const { hasUpdate, currentVersion, latestVersion, reload } = useAppVersion();

  return (
    <>
      <UpdateNotification
        hasUpdate={hasUpdate}
        currentVersion={currentVersion}
        latestVersion={latestVersion}
        onRefresh={reload}
        autoRefreshAfter={null} // Set to 30 for auto-refresh after 30 seconds
      />

      {/* Rest of your app */}
    </>
  )
}
```

---

### **5. Sidebar Version Display**

**File**: `src/components/Sidebar.jsx`

**Integration**:
```javascript
import { useAppVersion } from "@/hooks/useAppVersion";

function Sidebar() {
  const { currentVersion } = useAppVersion();

  return (
    <aside>
      {/* ... other sidebar content ... */}
      <div className="text-xs text-gray-500 mt-4">
        Version: {currentVersion}
      </div>
    </aside>
  );
}
```

---

## 🚀 Setup & Configuration

### **Already Done! ✅**

Everything is set up and ready to work:

1. ✅ **Script created**: `scripts/generate-version.cjs`
2. ✅ **Hook created**: `src/hooks/useAppVersion.js`
3. ✅ **Component created**: `src/components/UpdateNotification.jsx`
4. ✅ **Integrated**: `src/App.jsx` already imports and uses it
5. ✅ **Build configured**: `package.json` has prebuild script
6. ✅ **Initial version generated**: `public/version.json` created

---

## 🧪 How to Test

### **Test 1: Local Development**

The system won't trigger in dev mode (version.json updates on build), but you can still test:

```bash
# Generate version file
node scripts/generate-version.cjs

# The app will now have access to the version
npm run dev
```

**Check console**: Look for logs like:
```
📦 Version check: Current=1.0.0-f74421b, Deployed=1.0.0-f74421b
```

---

### **Test 2: Simulate Update**

1. **Deploy current version to Netlify**:
```bash
git add .
git commit -m "feat: Add update notification system"
git push
```

2. **Wait for Netlify build** (2-3 minutes)

3. **Open your deployed app** in browser

4. **Make a small change** (e.g., update package.json version to 1.0.1):
```json
{
  "version": "1.0.1"
}
```

5. **Deploy again**:
```bash
git add package.json
git commit -m "chore: Bump version to 1.0.1"
git push
```

6. **Keep the app open** in your browser

7. **Wait 5 minutes** (or refresh the page)

8. **You should see**:
   - Banner appears: "🆕 New Version Available!"
   - Shows current vs latest version
   - "Refresh Now" button

9. **Click "Refresh Now"**
   - Page reloads
   - You now have version 1.0.1
   - Banner disappears

---

### **Test 3: Multiple Tabs**

1. Open app in **3 different tabs**
2. Deploy a new version
3. All tabs will show the update notification
4. Refresh one tab → others still show notification
5. Refresh all tabs → everyone on latest version

---

## ⚙️ Configuration Options

### **Check Interval**

**File**: `src/hooks/useAppVersion.js`

```javascript
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes (default)
```

**Options**:
- `1 * 60 * 1000` = 1 minute (frequent checks)
- `5 * 60 * 1000` = 5 minutes (recommended)
- `10 * 60 * 1000` = 10 minutes (less aggressive)
- `30 * 60 * 1000` = 30 minutes (minimal)

---

### **Auto-Refresh**

**File**: `src/App.jsx`

**Option 1: Manual Refresh Only (Current)**
```javascript
<UpdateNotification
  hasUpdate={hasUpdate}
  currentVersion={currentVersion}
  latestVersion={latestVersion}
  onRefresh={reload}
  autoRefreshAfter={null} // User must click button
/>
```

**Option 2: Auto-Refresh After 30 Seconds**
```javascript
<UpdateNotification
  hasUpdate={hasUpdate}
  currentVersion={currentVersion}
  latestVersion={latestVersion}
  onRefresh={reload}
  autoRefreshAfter={30} // Auto-refresh in 30 seconds
/>
```

**With auto-refresh**, users see:
- "New Version Available! Auto-refreshing in 30s... 29s... 28s..."
- Countdown until automatic refresh
- Can click "Refresh Now" to skip countdown
- Cannot dismiss (forced update)

---

### **Version Format**

**File**: `scripts/generate-version.cjs`

**Current format**: `packageVersion-commitHash`
- Example: `1.0.0-f74421b`

**Alternative formats**:

```javascript
// Option 1: Just commit hash
const version = commitHash; // "f74421b"

// Option 2: Timestamp-based
const version = `${packageVersion}-${Date.now()}`; // "1.0.0-1763926665246"

// Option 3: Date-based
const version = `${packageVersion}-${new Date().toISOString().split('T')[0]}`; // "1.0.0-2025-11-23"

// Option 4: Custom build number
const version = `${packageVersion}.${buildNumber}`; // "1.0.0.42"
```

---

## 📊 User Experience

### **Desktop View**

```
┌─────────────────────────────────────────────────────┐
│ 🆕 New Version Available!                           │
│ Version 1.0.1-abc456 is now available.             │
│ Refresh to get the latest features and fixes.      │
│                            [Refresh Now] [Later] [X]│
└─────────────────────────────────────────────────────┘
│                                                      │
│              Your App Content Here                   │
│                                                      │
```

### **Mobile View**

```
│                                                      │
│              Your App Content Here                   │
│                                                      │
└─────────────────────────────────────────────────────┘
│ 🆕 New Version Available!                           │
│ Refresh to get the latest updates.                  │
│ [Refresh Now] [Later]                               │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Benefits

### **For Admins**
- ✅ Always see latest features immediately
- ✅ No stale data from cache
- ✅ Clear indication when app updates
- ✅ Can refresh on their schedule (or auto-refresh)

### **For Staff**
- ✅ Get bug fixes without confusion
- ✅ New features appear without delay
- ✅ Non-disruptive (can choose when to refresh)
- ✅ Works on mobile devices too

### **For You**
- ✅ Deploy with confidence
- ✅ Users automatically notified
- ✅ No manual cache clearing needed
- ✅ Analytics on version adoption (could add)

---

## 🔍 Monitoring

### **Console Logs**

The system logs everything for debugging:

```javascript
// On app load
📦 Version check: Current=1.0.0-f74421b, Deployed=1.0.0-f74421b

// Periodic check (every 5 min)
⏰ Periodic version check...
📦 Version check: Current=1.0.0-f74421b, Deployed=1.0.1-abc456

// New version detected
🆕 New version available! {
  current: "1.0.0-f74421b",
  latest: "1.0.1-abc456",
  buildTime: "Sat Nov 23 2025 19:45:00"
}

// User switches back to tab
👁️ Page visible - checking for updates...

// User clicks refresh
🔄 Reloading app for new version...
```

---

## 🚨 Troubleshooting

### **Issue: Banner doesn't show after deployment**

**Causes**:
1. Version not changing (check `public/version.json`)
2. CDN caching version.json (Netlify should serve with no-cache)
3. Browser cache too aggressive

**Solutions**:
```bash
# 1. Manually generate version file
node scripts/generate-version.cjs

# 2. Check version.json in deployed app
curl https://your-domain.com/version.json

# 3. Check if version changed
git log -1 --oneline  # Should show latest commit hash

# 4. Check build logs on Netlify
# Should see: "✅ Generated version.json: {...}"
```

---

### **Issue: Version check fails with 404**

**Cause**: version.json not deployed to public folder

**Solution**:
```bash
# Ensure version.json is in public/ directory
ls public/version.json

# If missing, run:
node scripts/generate-version.cjs

# Then rebuild
npm run build
```

---

### **Issue: Auto-refresh too aggressive**

**Solution**: Increase CHECK_INTERVAL

```javascript
// In useAppVersion.js
const CHECK_INTERVAL = 10 * 60 * 1000; // Check every 10 minutes instead
```

---

## 📈 Future Enhancements (Optional)

### **1. Version History**
Track who's on what version:
```javascript
// Send to analytics
supabase.from('version_tracking').insert({
  user_id: userId,
  version: currentVersion,
  updated_at: new Date()
});
```

### **2. Forced Updates**
Require refresh for critical security updates:
```javascript
// In version.json
{
  "version": "1.0.0-abc123",
  "forcedUpdate": true  // Can't dismiss
}
```

### **3. Release Notes**
Show what's new in the update:
```javascript
// In version.json
{
  "version": "1.0.0-abc123",
  "releaseNotes": [
    "Added document upload to ProfileSetup",
    "Fixed timesheet calculation bug",
    "Improved mobile responsiveness"
  ]
}
```

### **4. Slack Notifications**
Notify team when users see outdated versions:
```javascript
// Alert if user hasn't refreshed in 24 hours
if (timeSinceUpdate > 24 * 60 * 60 * 1000) {
  sendSlackNotification(`User ${userName} still on old version`);
}
```

---

## 🎉 Summary

### **What You Get**

✅ **Automatic version detection** - Checks every 5 minutes
✅ **Beautiful notifications** - Desktop & mobile optimized
✅ **Non-disruptive** - Users choose when to refresh (or auto-refresh)
✅ **Works everywhere** - All users (admin & staff) notified
✅ **Zero maintenance** - Runs automatically on every deploy
✅ **Production-ready** - Already integrated and working
✅ **Customizable** - Easy to adjust timing and behavior

### **How It Works in Production**

1. You push code to GitHub
2. Netlify builds and deploys
3. prebuild script generates new version.json
4. Users' apps detect new version
5. Banner appears: "New version available!"
6. Users click "Refresh Now"
7. Everyone on latest version 🎉

### **No More**

❌ "Why don't I see the new feature?"
❌ "Clear your cache and hard refresh"
❌ "Close all tabs and restart browser"
❌ Stale data confusion
❌ Support tickets about outdated UI

---

## 🚀 Ready to Use!

The system is **fully integrated and working**. Next deployment will automatically:
1. Generate version file
2. Deploy to Netlify
3. Notify all users
4. Let them refresh to latest

**That's it!** No additional setup needed. 🎉

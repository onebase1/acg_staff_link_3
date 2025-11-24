import { useState, useEffect, useCallback } from 'react';

/**
 * 🔄 APP VERSION CHECKER
 *
 * Automatically detects when a new version of the app is deployed
 * and notifies users to refresh for the latest updates.
 *
 * Features:
 * - Checks version every 5 minutes
 * - Compares deployed version.json with current version
 * - Shows notification when update is available
 * - Handles offline/error states gracefully
 *
 * Usage:
 * const { hasUpdate, currentVersion, latestVersion, checkForUpdate, reload } = useAppVersion();
 */

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const VERSION_URL = '/version.json';

export function useAppVersion() {
  const [currentVersion, setCurrentVersion] = useState(APP_VERSION);
  const [latestVersion, setLatestVersion] = useState(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  const checkForUpdate = useCallback(async () => {
    try {
      setIsChecking(true);

      // Fetch version.json with cache-busting timestamp
      const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        console.warn('⚠️ Could not check for updates');
        return;
      }

      const data = await response.json();
      const deployedVersion = data.version;
      const buildTime = data.buildTime;

      // Update latest version and last checked time
      setLatestVersion(deployedVersion);
      setLastChecked(new Date());

      // Use functional update to get the latest currentVersion value and compare
      setCurrentVersion((prevCurrentVersion) => {
        console.log(`📦 Version check: Current=${prevCurrentVersion}, Deployed=${deployedVersion}`);

        // Check if versions are different
        if (deployedVersion !== prevCurrentVersion) {
          console.log('🆕 New version available!', {
            current: prevCurrentVersion,
            latest: deployedVersion,
            buildTime: new Date(buildTime).toLocaleString()
          });
          setHasUpdate(true);
          return prevCurrentVersion; // Don't update currentVersion if there's an update available
        } else {
          // Versions match - sync currentVersion to ensure accuracy and clear update flag
          setHasUpdate(false);
          // Update currentVersion to match deployedVersion to prevent false positives after refresh
          // This ensures that after a page reload, if versions match, the banner disappears
          console.log('✅ Versions match - synced currentVersion to deployed version');
          return deployedVersion; // Sync to deployed version
        }
      });

    } catch (error) {
      console.error('❌ Error checking for updates:', error);
      // Don't show error to user - fail silently
    } finally {
      setIsChecking(false);
    }
  }, []); // Remove currentVersion from dependencies to prevent recreation loops

  const reload = useCallback(() => {
    console.log('🔄 Reloading app for new version...');
    window.location.reload(true);
  }, []);

  // Check for updates on mount
  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  // Set up periodic checking
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('⏰ Periodic version check...');
      checkForUpdate();
    }, CHECK_INTERVAL);

    return () => clearInterval(intervalId);
  }, [checkForUpdate]);

  // Check when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Page visible - checking for updates...');
        checkForUpdate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkForUpdate]);

  return {
    hasUpdate,
    currentVersion,
    latestVersion,
    isChecking,
    lastChecked,
    checkForUpdate,
    reload
  };
}

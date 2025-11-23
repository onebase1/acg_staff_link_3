import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, X, AlertCircle } from 'lucide-react';

/**
 * 🔔 UPDATE NOTIFICATION BANNER
 *
 * Shows a prominent notification when a new version of the app is available.
 * Provides options to:
 * - Refresh immediately to get the update
 * - Dismiss and be reminded later
 * - Auto-refresh after countdown (optional)
 *
 * Props:
 * - hasUpdate: boolean - Whether an update is available
 * - currentVersion: string - Current app version
 * - latestVersion: string - Latest deployed version
 * - onRefresh: function - Called when user clicks refresh
 * - autoRefreshAfter: number - Seconds to wait before auto-refresh (optional)
 */
export default function UpdateNotification({
  hasUpdate,
  currentVersion,
  latestVersion,
  onRefresh,
  autoRefreshAfter = null // Set to number (e.g., 30) to auto-refresh after X seconds
}) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [countdown, setCountdown] = useState(autoRefreshAfter);

  // Reset dismissal when update status changes
  useEffect(() => {
    if (hasUpdate) {
      setIsDismissed(false);
      setCountdown(autoRefreshAfter);
    }
  }, [hasUpdate, autoRefreshAfter]);

  // Handle auto-refresh countdown
  useEffect(() => {
    if (!hasUpdate || isDismissed || countdown === null) return;

    if (countdown === 0) {
      console.log('⏰ Auto-refresh countdown reached 0 - reloading...');
      onRefresh();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [hasUpdate, isDismissed, countdown, onRefresh]);

  const handleDismiss = () => {
    setIsDismissed(true);
    // Re-show after 15 minutes
    setTimeout(() => {
      setIsDismissed(false);
    }, 15 * 60 * 1000);
  };

  if (!hasUpdate || isDismissed) return null;

  return (
    <>
      {/* Desktop Version - Fixed Top Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 hidden md:block">
        <Alert className="rounded-none border-x-0 border-t-0 border-b-2 border-blue-500 bg-gradient-to-r from-blue-50 to-cyan-50 shadow-md">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          <AlertDescription className="flex items-center justify-between ml-2">
            <div className="flex items-center gap-4">
              <div>
                <p className="font-semibold text-blue-900">
                  🆕 New Version Available!
                </p>
                <p className="text-sm text-blue-700">
                  Version {latestVersion} is now available.
                  {countdown !== null && countdown > 0 && (
                    <span className="ml-1 font-medium">
                      Auto-refreshing in {countdown}s...
                    </span>
                  )}
                  {!countdown && (
                    <span className="ml-1">
                      Refresh to get the latest features and fixes.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={onRefresh}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Now
              </Button>
              {!countdown && (
                <Button
                  onClick={handleDismiss}
                  size="sm"
                  variant="ghost"
                  className="text-blue-600 hover:text-blue-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </div>

      {/* Mobile Version - Fixed Bottom Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <Alert className="rounded-none border-x-0 border-b-0 border-t-2 border-blue-500 bg-gradient-to-r from-blue-50 to-cyan-50 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <p className="font-semibold text-sm text-blue-900">
                  New Version Available!
                </p>
              </div>
              <p className="text-xs text-blue-700 mb-3">
                {countdown !== null && countdown > 0 ? (
                  <span>Auto-refreshing in {countdown} seconds...</span>
                ) : (
                  <span>Refresh to get the latest updates.</span>
                )}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={onRefresh}
                  size="sm"
                  className="flex-1 h-10 bg-blue-600 hover:bg-blue-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                {!countdown && (
                  <Button
                    onClick={handleDismiss}
                    size="sm"
                    variant="outline"
                    className="h-10"
                  >
                    Later
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Alert>
      </div>
    </>
  );
}

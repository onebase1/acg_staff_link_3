import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "sonner"
import UpdateNotification from "@/components/UpdateNotification"
import { useAppVersion } from "@/hooks/useAppVersion"

function App() {
  const { hasUpdate, currentVersion, latestVersion, reload } = useAppVersion();

  return (
    <>
      {/* Update Notification Banner */}
      <UpdateNotification
        hasUpdate={hasUpdate}
        currentVersion={currentVersion}
        latestVersion={latestVersion}
        onRefresh={reload}
        autoRefreshAfter={null} // Set to 30 to auto-refresh after 30 seconds
      />

      <Pages />
      <Toaster position="top-right" richColors />
    </>
  )
}

export default App 

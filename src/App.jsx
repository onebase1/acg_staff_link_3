import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "sonner"

function App() {
  return (
    <>
      <Pages />
      <Toaster position="top-right" richColors />
    </>
  )
}

export default App 
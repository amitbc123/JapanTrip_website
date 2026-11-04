import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { TreasureApp } from "@/treasure/TreasureApp"
import "@/treasure/treasure.css"

const rootElement = document.getElementById("root")
if (!rootElement) throw new Error("Root element not found")

createRoot(rootElement).render(
  <StrictMode>
    <TreasureApp />
  </StrictMode>
)

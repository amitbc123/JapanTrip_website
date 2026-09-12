import { createContext, type ReactNode, useEffect, useMemo, useState } from "react"
import {
  clearStoredTripData,
  readStoredFileHandle,
  readStoredTripData,
  writeStoredFileHandle,
  writeStoredTripData,
} from "@/data/db"
import { isTripData } from "@/data/validateTripData"
import type { TripData } from "@/types/trip"

export type TripDataStatus = "loading" | "empty" | "ready" | "error"

export interface TripDataContextValue {
  status: TripDataStatus
  data: TripData | null
  error: string | null
  canReimportSameFile: boolean
  importFile: (file: File) => Promise<void>
  importViaFilePicker: () => Promise<void>
  reimportSameFile: () => Promise<void>
  clear: () => Promise<void>
}

export const TripDataContext = createContext<TripDataContextValue | null>(null)

const PARSE_ERROR = "הקובץ שנבחר אינו קובץ JSON תקין."
const SHAPE_ERROR = "הקובץ אינו תואם למבנה הנתונים הצפוי של הטיול."

function hasFileSystemAccess(): boolean {
  return typeof window !== "undefined" && "showOpenFilePicker" in window
}

export function TripDataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<TripDataStatus>("loading")
  const [data, setData] = useState<TripData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasStoredHandle, setHasStoredHandle] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      const stored = await readStoredTripData()
      if (cancelled) return
      if (stored) {
        setData(stored)
        setStatus("ready")
      } else {
        setStatus("empty")
      }
      const handle = await readStoredFileHandle()
      if (!cancelled) setHasStoredHandle(Boolean(handle))
    }
    hydrate()
    return () => {
      cancelled = true
    }
  }, [])

  async function acceptParsedText(text: string): Promise<void> {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      setError(PARSE_ERROR)
      setStatus("error")
      return
    }
    if (!isTripData(parsed)) {
      setError(SHAPE_ERROR)
      setStatus("error")
      return
    }
    await writeStoredTripData(parsed)
    setData(parsed)
    setError(null)
    setStatus("ready")
  }

  async function importFile(file: File): Promise<void> {
    const text = await file.text()
    await acceptParsedText(text)
  }

  async function importViaFilePicker(): Promise<void> {
    if (!hasFileSystemAccess()) return
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: "Trip data JSON", accept: { "application/json": [".json"] } }],
      })
      const file = await handle.getFile()
      await importFile(file)
      await writeStoredFileHandle(handle)
      setHasStoredHandle(true)
    } catch (err) {
      // AbortError when the user cancels the picker — not a real error.
      if (err instanceof DOMException && err.name === "AbortError") return
      setError(PARSE_ERROR)
      setStatus("error")
    }
  }

  async function reimportSameFile(): Promise<void> {
    const handle = await readStoredFileHandle()
    if (!handle) return
    const permission = await handle.queryPermission({ mode: "read" })
    if (permission !== "granted") {
      const requested = await handle.requestPermission({ mode: "read" })
      if (requested !== "granted") return
    }
    const file = await handle.getFile()
    await importFile(file)
  }

  async function clear(): Promise<void> {
    await clearStoredTripData()
    setData(null)
    setError(null)
    setHasStoredHandle(false)
    setStatus("empty")
  }

  const value = useMemo<TripDataContextValue>(
    () => ({
      status,
      data,
      error,
      canReimportSameFile: hasStoredHandle && hasFileSystemAccess(),
      importFile,
      importViaFilePicker,
      reimportSameFile,
      clear,
    }),
    [status, data, error, hasStoredHandle]
  )

  return <TripDataContext.Provider value={value}>{children}</TripDataContext.Provider>
}

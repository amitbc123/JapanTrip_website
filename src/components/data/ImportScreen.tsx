import { type ChangeEvent, useRef } from "react"
import { useTripDataContext } from "@/data/useTripData"

function hasFileSystemAccess(): boolean {
  return typeof window !== "undefined" && "showOpenFilePicker" in window
}

export function ImportScreen() {
  const { status, error, importFile, importViaFilePicker } = useTripDataContext()
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await importFile(file)
    e.target.value = ""
  }

  async function loadSampleData() {
    const res = await fetch(`${import.meta.env.BASE_URL}sample-trip-data.json`)
    const text = await res.text()
    const file = new File([text], "sample-trip-data.json", { type: "application/json" })
    await importFile(file)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">מלווה הטיול ליפן</h1>
          <p className="text-sm text-muted-foreground">
            טענו את קובץ נתוני הטיול שלכם כדי להתחיל. הקובץ נשמר רק על המכשיר הזה ולא נשלח
            לשום שרת.
          </p>
        </div>

        {status === "error" && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {hasFileSystemAccess() && (
          <button
            type="button"
            onClick={importViaFilePicker}
            className="h-11 rounded-md bg-primary font-medium text-primary-foreground hover:opacity-90"
          >
            בחירת קובץ הטיול
          </button>
        )}

        <div className="flex flex-col gap-1.5">
          {!hasFileSystemAccess() && (
            <span className="text-xs text-muted-foreground">בחירת קובץ הטיול</span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleFileInputChange}
            className="h-11 w-full cursor-pointer rounded-md border border-input bg-background text-sm file:mr-3 file:h-full file:cursor-pointer file:border-0 file:bg-secondary file:px-3 file:text-secondary-foreground"
          />
        </div>

        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={loadSampleData}
            className="h-11 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:bg-accent/40"
          >
            טען נתוני דוגמה (פיתוח בלבד)
          </button>
        )}
      </div>
    </div>
  )
}

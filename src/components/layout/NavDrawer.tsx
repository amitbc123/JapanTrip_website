import {
  BedDoubleIcon,
  CompassIcon,
  DownloadIcon,
  InfoIcon,
  MapIcon,
  PaletteIcon,
  RefreshCwIcon,
  TicketIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react"
import { Popover } from "radix-ui"
import { type ChangeEvent, useRef } from "react"
import { NavLink } from "react-router"
import { Drawer as DrawerPrimitive } from "vaul"
import {
  Drawer,
  DrawerClose,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useTripDataContext } from "@/data/useTripData"
import { downloadBookingStatusExport, parseBookingStatusImport } from "@/lib/bookingStatus"
import { cn } from "@/lib/utils"
import { useBackgroundColorStore } from "@/stores/background-color-store"
import { useBookingStatusStore } from "@/stores/booking-status-store"
import { useDrawerStore } from "@/stores/drawer-store"

const NAV_ITEMS = [
  { to: "/", label: "מפת מסלול", icon: MapIcon },
  { to: "/hotels", label: "מלונות", icon: BedDoubleIcon },
  { to: "/attractions", label: "אטרקציות", icon: TicketIcon },
  { to: "/recommendations", label: "המלצות", icon: CompassIcon },
  { to: "/tips", label: "מידע וטיפים", icon: InfoIcon },
] as const

function hasFileSystemAccess(): boolean {
  return typeof window !== "undefined" && "showOpenFilePicker" in window
}

export function NavDrawer() {
  const isOpen = useDrawerStore((s) => s.isOpen)
  const setOpen = useDrawerStore((s) => s.close)
  const open = useDrawerStore((s) => s.open)
  const { importFile, importViaFilePicker, clear } = useTripDataContext()
  const backgroundColor = useBackgroundColorStore((s) => s.color)
  const setBackgroundColor = useBackgroundColorStore((s) => s.setColor)
  const statusEntries = useBookingStatusStore((s) => s.entries)
  const importStatusEntries = useBookingStatusStore((s) => s.importEntries)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const statusFileInputRef = useRef<HTMLInputElement>(null)

  async function handleStatusFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const text = await file.text()
    const parsed = parseBookingStatusImport(text)
    if (parsed) importStatusEntries(parsed)
    setOpen()
  }

  async function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await importFile(file)
    e.target.value = ""
    setOpen()
  }

  async function handleLoadNewFile() {
    if (hasFileSystemAccess()) {
      await importViaFilePicker()
      setOpen()
    } else {
      fileInputRef.current?.click()
    }
  }

  async function handleClear() {
    await clear()
    setOpen()
  }

  return (
    <Drawer
      direction="right"
      open={isOpen}
      onOpenChange={(next) => (next ? open() : setOpen())}
    >
      <DrawerPortal>
        <DrawerOverlay />
        {/* Physically pinned to the right viewport edge to match vaul's
            direction="right" drag physics (which are physical, not
            RTL/logical-aware) — see plan notes on the shadcn Drawer's
            logical end-0 classes not being safe to reuse under dir="rtl". */}
        <DrawerPrimitive.Content
          data-slot="drawer-content"
          className="fixed inset-y-0 right-0 z-50 flex h-full w-3/4 max-w-xs flex-col gap-0 rounded-l-xl border-l border-border bg-popover text-popover-foreground shadow-xl outline-none sm:max-w-sm"
        >
          <div className="flex items-center justify-between border-b border-border p-4">
            <DrawerTitle className="text-base font-semibold">תפריט</DrawerTitle>
            <div className="flex items-center gap-1">
              <Popover.Root>
                <Popover.Trigger
                  aria-label="שינוי צבע רקע האפליקציה"
                  className="flex h-11 w-11 items-center justify-center rounded-md text-ink-muted hover:bg-accent"
                >
                  <PaletteIcon className="size-5" aria-hidden />
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    sideOffset={8}
                    className="z-50 flex flex-col gap-2 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg outline-none"
                  >
                    <label className="flex items-center justify-between gap-3 text-sm">
                      צבע רקע האפליקציה
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent p-0.5"
                        aria-label="בחירת צבע רקע"
                      />
                    </label>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
              <DrawerClose className="flex h-11 w-11 items-center justify-center rounded-md text-ink-muted hover:bg-accent">
                <span className="sr-only">סגירה</span>
                <XIcon className="size-5" aria-hidden />
              </DrawerClose>
            </div>
          </div>
          <nav className="flex flex-col gap-1 p-3">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={setOpen}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-base transition-colors",
                    isActive
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-foreground hover:bg-accent/60"
                  )
                }
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-1 border-t border-border p-3">
            <button
              type="button"
              onClick={() => downloadBookingStatusExport(statusEntries)}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-start text-sm text-foreground hover:bg-accent/60"
            >
              <DownloadIcon className="size-5 shrink-0" aria-hidden />
              ייצוא סטטוס הזמנות
            </button>
            <button
              type="button"
              onClick={() => statusFileInputRef.current?.click()}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-start text-sm text-foreground hover:bg-accent/60"
            >
              <UploadIcon className="size-5 shrink-0" aria-hidden />
              ייבוא סטטוס הזמנות
            </button>
            <input
              ref={statusFileInputRef}
              type="file"
              accept="application/json"
              onChange={handleStatusFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleLoadNewFile}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-start text-sm text-foreground hover:bg-accent/60"
            >
              <RefreshCwIcon className="size-5 shrink-0" aria-hidden />
              טעינת קובץ חדש
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleClear}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-start text-sm text-destructive hover:bg-accent/60"
            >
              <Trash2Icon className="size-5 shrink-0" aria-hidden />
              מחיקת הנתונים מהמכשיר
            </button>
          </div>
        </DrawerPrimitive.Content>
      </DrawerPortal>
    </Drawer>
  )
}

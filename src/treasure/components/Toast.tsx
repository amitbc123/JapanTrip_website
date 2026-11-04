import { useUi } from "@/treasure/store"

export function Toast() {
  const toast = useUi((s) => s.toast)
  if (!toast) return null
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[1200] mx-auto w-fit max-w-[90vw] rounded-full bg-ink px-4 py-2.5 text-center text-sm font-semibold text-sea shadow-lg"
    >
      {toast.text}
    </div>
  )
}

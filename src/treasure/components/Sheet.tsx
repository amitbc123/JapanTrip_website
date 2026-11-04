import type { ReactNode } from "react"
import { Drawer } from "vaul"

/** Bottom sheet (vaul): drag down or tap outside to close. */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="bottom">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[1100] bg-black/50" />
        <Drawer.Content
          dir="rtl"
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-[1101] mx-auto flex max-h-[88dvh] max-w-2xl flex-col rounded-t-3xl border-t border-line bg-sea-2 text-ink outline-none"
        >
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-line" aria-hidden />
          <Drawer.Title className="px-5 pt-3 pb-1 text-lg font-bold">{title}</Drawer.Title>
          <div className="overflow-y-auto px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

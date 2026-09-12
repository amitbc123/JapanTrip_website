import { NOT_AVAILABLE, orNotAvailable } from "@/lib/format"

interface FieldRowProps {
  label: string
  value: string | null | undefined
}

export function FieldRow({ label, value }: FieldRowProps) {
  const resolved = orNotAvailable(value)
  const isMissing = resolved === NOT_AVAILABLE
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={isMissing ? "text-sm text-muted-foreground italic" : "text-sm"}>
        {resolved}
      </span>
    </div>
  )
}

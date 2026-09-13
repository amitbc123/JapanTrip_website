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
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={isMissing ? "text-[15px] text-muted-foreground italic" : "text-[15px]"}>
        {resolved}
      </span>
    </div>
  )
}

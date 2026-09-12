import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { FieldRow } from "@/components/common/FieldRow"
import { formatHebrewDate, formatPrice } from "@/lib/format"
import { translateCity } from "@/lib/translations"
import type { Attraction } from "@/types/trip"

export function AttractionListItem({ attraction }: { attraction: Attraction }) {
  return (
    <AccordionItem
      value={attraction.name}
      className="border-b border-border px-4"
    >
      <AccordionTrigger className="items-center py-3">
        <div className="flex w-full flex-col gap-1 text-start">
          <span className="font-semibold">{attraction.name}</span>
          <span className="text-xs text-muted-foreground">
            {translateCity(attraction.city)} · {formatHebrewDate(attraction.date, true)} · {attraction.entryTime}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0 sm:grid-cols-3">
          <FieldRow label="מספר אישור" value={attraction.confirmationNumber} />
          <FieldRow label="מספר שובר" value={attraction.voucherNumber} />
          <FieldRow label="מחיר" value={formatPrice(attraction.price)} />
          <FieldRow label="כתובת" value={attraction.address} />
        </div>
        <FieldRow label="הערות" value={attraction.notes} />
      </AccordionContent>
    </AccordionItem>
  )
}

import { ChevronDownIcon, ChevronUpIcon, MapPinIcon } from "lucide-react"
import { Accordion as AccordionPrimitive } from "radix-ui"
import { Link } from "react-router"
import { AccordionContent, AccordionItem } from "@/components/ui/accordion"
import { FieldRow } from "@/components/common/FieldRow"
import { formatAttractionWhen, formatPrice } from "@/lib/format"
import { translateCity } from "@/lib/translations"
import type { Attraction } from "@/types/trip"

export function AttractionListItem({ attraction }: { attraction: Attraction }) {
  return (
    <AccordionItem value={attraction.name} className="border-b border-border px-4">
      <AccordionPrimitive.Header className="flex items-center gap-1">
        <AccordionPrimitive.Trigger className="group/accordion-trigger relative flex flex-1 items-start justify-between rounded-lg border border-transparent py-2.5 text-start text-sm font-medium outline-none hover:underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 **:data-[slot=accordion-trigger-icon]:ms-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground">
          <div className="flex w-full flex-col gap-1">
            <span className="text-[15px] font-semibold">{attraction.name}</span>
            <span className="text-[13px] text-muted-foreground">
              {translateCity(attraction.city)} ·{" "}
              {formatAttractionWhen(attraction.date, attraction.entryTime)}
            </span>
          </div>
          <ChevronDownIcon
            data-slot="accordion-trigger-icon"
            className="pointer-events-none ms-auto size-4 shrink-0 text-muted-foreground group-aria-expanded/accordion-trigger:hidden"
          />
          <ChevronUpIcon
            data-slot="accordion-trigger-icon"
            className="pointer-events-none ms-auto hidden size-4 shrink-0 text-muted-foreground group-aria-expanded/accordion-trigger:inline"
          />
        </AccordionPrimitive.Trigger>
        <Link
          to={`/?attraction=${encodeURIComponent(attraction.name)}`}
          aria-label={`הצג את ${attraction.name} על המפה`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <MapPinIcon className="size-5" aria-hidden />
        </Link>
      </AccordionPrimitive.Header>
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

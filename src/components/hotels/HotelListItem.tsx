import { ChevronDownIcon, ChevronUpIcon, MapPinIcon } from "lucide-react"
import { Accordion as AccordionPrimitive } from "radix-ui"
import { Link } from "react-router"
import { AccordionContent, AccordionItem } from "@/components/ui/accordion"
import { FieldRow } from "@/components/common/FieldRow"
import { formatHebrewDateRange, formatHebrewTime, formatPrice, hotelAccordionId } from "@/lib/format"
import { translateCity } from "@/lib/translations"
import type { Hotel } from "@/types/trip"

export function HotelListItem({ hotel }: { hotel: Hotel }) {
  const dateRange =
    hotel.checkIn && hotel.checkOut
      ? formatHebrewDateRange(hotel.checkIn, hotel.checkOut)
      : "לא זמין"

  return (
    <AccordionItem
      id={hotelAccordionId(hotel.order)}
      value={hotelAccordionId(hotel.order)}
      className="scroll-mt-20 border-b border-border px-4"
    >
      <AccordionPrimitive.Header className="flex items-center gap-1">
        <AccordionPrimitive.Trigger className="group/accordion-trigger relative flex flex-1 items-start justify-between rounded-lg border border-transparent py-2.5 text-start text-sm font-medium outline-none hover:underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 **:data-[slot=accordion-trigger-icon]:ms-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground">
          <div className="flex w-full flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {hotel.order}
              </span>
              <span className="text-[15px] font-semibold">{hotel.name}</span>
            </div>
            <span className="text-[13px] text-muted-foreground">
              {translateCity(hotel.city)} · {dateRange} · {hotel.nights} לילות · {formatPrice(hotel.price)}
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
          to={`/?hotel=${hotel.order}`}
          aria-label={`הצג את ${hotel.name} על המפה`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <MapPinIcon className="size-5" aria-hidden />
        </Link>
      </AccordionPrimitive.Header>
      <AccordionContent>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0 sm:grid-cols-3">
          <FieldRow label="כתובת" value={hotel.address} />
          <FieldRow label="טלפון" value={hotel.phone} />
          <FieldRow label="מספר אישור" value={hotel.confirmationNumber} />
          <FieldRow label="קוד כניסה" value={hotel.pinCode} />
          <FieldRow label="שעת צ'ק-אין" value={hotel.checkIn ? formatHebrewTime(hotel.checkIn) : null} />
          <FieldRow label="שעת צ'ק-אאוט" value={hotel.checkOut ? formatHebrewTime(hotel.checkOut) : null} />
        </div>
        <FieldRow label="הערות" value={hotel.notes} />
      </AccordionContent>
    </AccordionItem>
  )
}

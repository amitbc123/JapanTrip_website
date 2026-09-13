import { ChevronDownIcon, ChevronUpIcon, MapPinIcon } from "lucide-react"
import { Accordion as AccordionPrimitive } from "radix-ui"
import { Link } from "react-router"
import { AccordionContent, AccordionItem } from "@/components/ui/accordion"
import { FieldRow } from "@/components/common/FieldRow"
import { formatCostPerPerson, NOT_AVAILABLE } from "@/lib/format"
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/lib/recommendationCategories"
import type { Recommendation } from "@/types/trip"

export function RecommendationListItem({
  recommendation,
  distanceKm,
}: {
  recommendation: Recommendation
  distanceKm: number | null
}) {
  const CategoryIcon = CATEGORY_ICONS[recommendation.category]

  return (
    <AccordionItem value={recommendation.id} className="border-b border-border px-4">
      <AccordionPrimitive.Header className="flex items-center gap-1">
        <AccordionPrimitive.Trigger className="group/accordion-trigger relative flex flex-1 items-start justify-between rounded-lg border border-transparent py-2.5 text-start text-sm font-medium outline-none hover:underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 **:data-[slot=accordion-trigger-icon]:ms-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground">
          <div className="flex w-full flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <CategoryIcon className="size-3.5" aria-hidden />
              </span>
              <span className="text-[15px] font-semibold">{recommendation.name}</span>
            </div>
            <span className="text-[13px] text-muted-foreground">
              {CATEGORY_LABELS[recommendation.category]} · {formatCostPerPerson(recommendation.costPerPerson)}
              {distanceKm !== null && ` · ${distanceKm.toFixed(1)} ק"מ מהמלון`}
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
          to={`/?rec=${recommendation.id}`}
          aria-label={`הצג את ${recommendation.name} על המפה`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <MapPinIcon className="size-5" aria-hidden />
        </Link>
      </AccordionPrimitive.Header>
      <AccordionContent>
        {recommendation.photoUrl && (
          <img
            src={recommendation.photoUrl}
            alt={recommendation.name}
            loading="lazy"
            className="mb-2 h-40 w-full rounded-md object-cover"
          />
        )}
        <p className="text-[15px]">{recommendation.description}</p>
        {/* Addresses/URLs are Latin text; explicit dir="ltr" avoids the Unicode
            bidi algorithm reordering a leading house number (e.g. "598 Some
            Street") when this LTR text wraps inside the page's RTL context. */}
        <div className="flex flex-col gap-0.5 py-1.5">
          <span className="text-[13px] text-muted-foreground">כתובת</span>
          <span
            dir={recommendation.address ? "ltr" : undefined}
            className={
              recommendation.address
                ? "block text-end text-[15px]"
                : "block text-end text-[15px] text-muted-foreground italic"
            }
          >
            {recommendation.address ?? NOT_AVAILABLE}
          </span>
        </div>
        {recommendation.websiteUrl && (
          <div className="flex flex-col gap-0.5 py-1.5">
            <span className="text-[13px] text-muted-foreground">אתר</span>
            <a
              href={recommendation.websiteUrl}
              target="_blank"
              rel="noreferrer"
              dir="ltr"
              className="block text-end text-[15px] underline underline-offset-3 hover:text-foreground"
            >
              {recommendation.websiteUrl}
            </a>
          </div>
        )}
        <FieldRow label="הערות" value={recommendation.notes} />
      </AccordionContent>
    </AccordionItem>
  )
}

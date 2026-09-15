import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import travelTips from "@/data/travel-tips.json"
import { formatHebrewDate } from "@/lib/format"

interface BookingSystem {
  name: string
  subtitle: string
  url: string | null
  window: string
}

interface HardTunnelSegment {
  date: string
  route: string
  tunnel: string
  duration: string
}

interface LuggageForwarding {
  date: string
  from: string
  to: string
  note: string
}

const tips = travelTips as {
  bookingSystems: BookingSystem[]
  goldenRules: string[]
  suica: { instructions: string[]; doesNotWorkAt: string[] }
  noReservationNeeded: string[]
  hardTunnelSegments: HardTunnelSegment[]
  tunnelTips: string[]
  stationWarnings: string[]
  luggageForwarding: LuggageForwarding[]
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2 text-[14px]">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="text-muted-foreground">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function TravelTipsPage() {
  return (
    <div className="mx-auto max-w-2xl pb-8">
      <Accordion type="multiple" defaultValue={["stationWarnings"]}>
        <AccordionItem value="stationWarnings" className="border-b border-border px-4">
          <AccordionTrigger>
            <span className="text-[15px] font-semibold">אזהרות חשובות</span>
          </AccordionTrigger>
          <AccordionContent>
            <BulletList items={tips.stationWarnings} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tunnels" className="border-b border-border px-4">
          <AccordionTrigger>
            <span className="text-[15px] font-semibold">שלוש הנסיעות הקשות למנהרות</span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-3">
              {tips.hardTunnelSegments.map((seg) => (
                <div key={seg.route} className="rounded-lg border border-border bg-card p-3">
                  <div className="text-[14px] font-medium">
                    {formatHebrewDate(seg.date, true)} · {seg.route}
                  </div>
                  <div className="mt-1 text-[13px] text-muted-foreground">{seg.tunnel}</div>
                  <div className="text-[13px] text-muted-foreground">{seg.duration}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[13px] font-medium text-muted-foreground">מה שעוזר:</p>
            <BulletList items={tips.tunnelTips} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="booking" className="border-b border-border px-4">
          <AccordionTrigger>
            <span className="text-[15px] font-semibold">מערכות הזמנה וחוקי ברזל</span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-3">
              {tips.bookingSystems.map((system) => (
                <div key={system.name} className="rounded-lg border border-border bg-card p-3">
                  <div className="text-[14px] font-medium">
                    {system.url ? (
                      <a href={system.url} target="_blank" rel="noreferrer">
                        {system.name}
                      </a>
                    ) : (
                      system.name
                    )}{" "}
                    <span className="text-muted-foreground">· {system.subtitle}</span>
                  </div>
                  <div className="mt-1 text-[13px] text-muted-foreground">{system.window}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[13px] font-medium text-muted-foreground">חוקי ברזל:</p>
            <BulletList items={tips.goldenRules} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="suica" className="border-b border-border px-4">
          <AccordionTrigger>
            <span className="text-[15px] font-semibold">Suica</span>
          </AccordionTrigger>
          <AccordionContent>
            <BulletList items={tips.suica.instructions} />
            <p className="mt-3 text-[13px] font-medium text-destructive">איפה לא עובד:</p>
            <BulletList items={tips.suica.doesNotWorkAt} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="noReservation" className="border-b border-border px-4">
          <AccordionTrigger>
            <span className="text-[15px] font-semibold">נסיעות שלא צריך להזמין</span>
          </AccordionTrigger>
          <AccordionContent>
            <BulletList items={tips.noReservationNeeded} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="luggage" className="border-b border-border px-4">
          <AccordionTrigger>
            <span className="text-[15px] font-semibold">משלוח מזוודות (Takkyubin)</span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-3">
              {tips.luggageForwarding.map((leg) => (
                <div key={`${leg.date}-${leg.from}`} className="rounded-lg border border-border bg-card p-3">
                  <div className="text-[14px] font-medium">
                    {formatHebrewDate(leg.date, true)} · {leg.from} ← {leg.to}
                  </div>
                  <div className="mt-1 text-[13px] text-muted-foreground">{leg.note}</div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

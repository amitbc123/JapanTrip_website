import { useEffect, useState } from "react"
import { useSearchParams } from "react-router"
import { Accordion } from "@/components/ui/accordion"
import { HotelListItem } from "@/components/hotels/HotelListItem"
import { useTripData } from "@/data/useTripData"
import { hotelAccordionId } from "@/lib/format"

export function HotelsPage() {
  const tripData = useTripData()
  const [searchParams] = useSearchParams()
  const openParam = searchParams.get("open")
  const [openItems, setOpenItems] = useState<string[]>(
    openParam ? [hotelAccordionId(Number(openParam))] : []
  )

  useEffect(() => {
    if (!openParam) return
    const id = hotelAccordionId(Number(openParam))
    setOpenItems((prev) => (prev.includes(id) ? prev : [...prev, id]))
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [openParam])

  const hotelsInOrder = [...tripData.hotels].sort((a, b) => a.order - b.order)

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <Accordion type="multiple" value={openItems} onValueChange={setOpenItems}>
        {hotelsInOrder.map((hotel) => (
          <HotelListItem key={hotel.order} hotel={hotel} />
        ))}
      </Accordion>
    </div>
  )
}

import { DeliveryCard } from "./delivery-card"
import type { Delivery } from "@/lib/types"

interface DeliveryListProps {
  deliveries: Delivery[]
}

export function DeliveryList({ deliveries }: DeliveryListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {deliveries.map((delivery) => (
        <DeliveryCard key={delivery.id} delivery={delivery} />
      ))}
    </div>
  )
}

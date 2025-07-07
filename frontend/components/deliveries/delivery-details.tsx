import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui-custom/status-badge"
import { DeliveryMap } from "./delivery-map"
import type { Delivery, Location } from "@/lib/types"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface DeliveryDetailsProps {
  delivery: Delivery
  locations: Location[]
}

export function DeliveryDetails({ delivery, locations }: DeliveryDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Entrega #{delivery.id.substring(0, 8)}</h2>
          <p className="text-gray-500">Criada em {format(new Date(delivery.createdAt), "dd/MM/yyyy", { locale: ptBR })}</p>
        </div>
        <StatusBadge status={delivery.status} statusText={delivery.statusText} size="lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Detalhes da Entrega</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Produto</h3>
              <p>{delivery.productName}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Endereço de Entrega</h3>
              <p>{delivery.address}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Entregador</h3>
              <p>{delivery.courierName}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Previsão de Entrega</h3>
              <p>{delivery.estimatedDelivery}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Rastreamento em Tempo Real</CardTitle>
            <CardDescription>Acompanhe a localização do seu entregador</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full rounded-md overflow-hidden">
              <DeliveryMap
                locations={locations}
                destination={{
                  lat: delivery.destinationLat,
                  lng: delivery.destinationLng,
                  address: delivery.address,
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

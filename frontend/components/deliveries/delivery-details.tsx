import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui-custom/status-badge"
import { DeliveryMap } from "./delivery-map"
import type { Delivery, Location } from "@/lib/types"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Truck, MapPin, Clock, Navigation, CheckCircle } from "lucide-react"

interface DeliveryDetailsProps {
  delivery: Delivery
  locations: Location[]
}

function CourierStatus({ locations, destination, delivery }: { locations: Location[], destination: { lat: number, lng: number, address: string }, delivery: any }) {
  if (locations.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Aguardando início da entrega...</p>
      </div>
    )
  }

  const lastLocation = locations[locations.length - 1]
  const distanceToDestination = Math.sqrt(
    Math.pow(lastLocation.latitude - destination.lat, 2) + 
    Math.pow(lastLocation.longitude - destination.lng, 2)
  ) * 111 // Aproximadamente km

  // Verifica se a entrega foi concluída
  const isDelivered = delivery.status === 'DELIVERED' || delivery.status === 'delivered'

  const getStatusText = () => {
    if (isDelivered) return "Entrega concluída! 🎉"
    if (distanceToDestination < 0.1) return "Próximo ao destino"
    if (distanceToDestination < 0.5) return "Aproximando-se"
    if (distanceToDestination < 2) return "Em trânsito"
    return "A caminho"
  }

  const getStatusColor = () => {
    if (isDelivered) return "text-green-600"
    if (distanceToDestination < 0.1) return "text-green-600"
    if (distanceToDestination < 0.5) return "text-yellow-600"
    return "text-blue-600"
  }

  const getMainText = () => {
    if (isDelivered) return "Entrega finalizada"
    return "Entregador em movimento"
  }

  const getIcon = () => {
    if (isDelivered) {
      return (
        <div className="bg-green-100 p-2 rounded-full">
          <CheckCircle className="h-5 w-5 text-green-600" />
        </div>
      )
    }
    return (
      <div className="bg-blue-100 p-2 rounded-full">
        <Truck className="h-5 w-5 text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        {getIcon()}
        <div>
          <p className="font-medium">{getMainText()}</p>
          <p className={`text-sm ${getStatusColor()}`}>{getStatusText()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Distância</span>
          </div>
          <p className="font-semibold text-lg">
            {isDelivered ? "0.00 km" : `${distanceToDestination.toFixed(2)} km`}
          </p>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Última atualização</span>
          </div>
          <p className="font-semibold text-lg">
            {new Date(lastLocation.timestamp).toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>
      </div>

      <div className="bg-blue-50 p-3 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Navigation className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Progresso do trajeto</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              isDelivered ? 'bg-green-600' : 'bg-blue-600'
            }`}
            style={{ 
              width: isDelivered ? '100%' : `${Math.min(100, Math.max(0, (1 - distanceToDestination / 5) * 100))}%` 
            }}
          ></div>
        </div>
      </div>
    </div>
  )
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
          <CardContent className="space-y-4">
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
            
            <CourierStatus 
              locations={locations}
              destination={{
                lat: delivery.destinationLat,
                lng: delivery.destinationLng,
                address: delivery.address,
              }}
              delivery={delivery}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

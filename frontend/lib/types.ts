// Tipo para representar uma entrega
export interface Delivery {
  id: string
  productName: string
  address: string
  status: string
  statusText: string
  createdAt: string
  estimatedDelivery: string
  courierName: string
  destinationLat: number
  destinationLng: number
}

// Tipo para representar uma localização do entregador
export interface Location {
  id: string
  deliveryId: string
  latitude: number
  longitude: number
  timestamp: string
}

// Declaração para o Leaflet no window
declare global {
  interface Window {
    L: any
  }
}

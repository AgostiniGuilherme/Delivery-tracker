// frontend/components/deliveries/delivery-map.tsx

"use client"

import { useEffect, useRef } from "react"
import type { Location } from "@/lib/types" //

interface DeliveryMapProps {
  locations: Location[]
  destination: {
    lat: number
    lng: number
    address: string
  }
}

export function DeliveryMap({ locations, destination }: DeliveryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const polylineRef = useRef<any>(null)
  const courierMarkerRef = useRef<any>(null)
  const isInitializedRef = useRef(false)

  useEffect(() => {
    // Carrega o script do Leaflet dinamicamente
    const loadLeaflet = async () => {
      // Verifica se o Leaflet já está carregado
      if (window.L) return window.L

      // Carrega o CSS do Leaflet
      const linkEl = document.createElement("link")
      linkEl.rel = "stylesheet"
      linkEl.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(linkEl)

      // Carrega o script do Leaflet
      const scriptEl = document.createElement("script")
      scriptEl.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      document.head.appendChild(scriptEl)

      return new Promise<any>((resolve) => {
        scriptEl.onload = () => resolve(window.L)
      })
    }

    const initMap = async () => {
      if (!mapRef.current) return

      const L = await loadLeaflet()

      // Se o mapa já foi inicializado, não inicializa novamente
      if (mapInstanceRef.current) return

      // Inicializa o mapa com zoom mais próximo
      const map = L.map(mapRef.current).setView([destination.lat, destination.lng], 15)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map)

      // Adiciona marcador do destino
      const destinationIcon = L.divIcon({
        html: `<div class="flex items-center justify-center bg-red-500 text-white rounded-full p-1 border-2 border-white shadow-lg" style="width: 32px; height: 32px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </div>`,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      })

      L.marker([destination.lat, destination.lng], { icon: destinationIcon })
        .addTo(map)
        .bindPopup(`<b>🎯 Destino:</b> ${destination.address}`)

      mapInstanceRef.current = map
      isInitializedRef.current = true
    }

    initMap()
  }, [destination])

  // Atualiza os marcadores e a rota quando as localizações mudam
  useEffect(() => {
    const updateMap = async () => {
      if (!mapInstanceRef.current || !isInitializedRef.current) return

      console.log('🗺️ Atualizando mapa com', locations.length, 'localizações:', locations)

      const L = window.L
      const map = mapInstanceRef.current

      // Remove marcadores antigos (exceto o do entregador)
      markersRef.current.forEach((marker) => map.removeLayer(marker))
      markersRef.current = []

      // Remove polyline antiga
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current)
      }

      // Adiciona novos marcadores e constrói o caminho
      const path = locations.map((loc) => [loc.latitude, loc.longitude])

      // Atualiza ou cria marcador do entregador
      if (locations.length > 0) {
        const lastLocation = locations[locations.length - 1]

        const courierIcon = L.divIcon({
          html: `<div class="flex items-center justify-center bg-blue-500 text-white rounded-full p-1 border-2 border-white shadow-lg courier-marker" style="width: 36px; height: 36px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8"></path><path d="m4.93 10.93 1.41 1.41"></path><path d="M2 18h2"></path><path d="M20 18h2"></path><path d="m19.07 10.93-1.41 1.41"></path><path d="M22 22H2"></path><path d="m16 6-4 4-4-4"></path><path d="M16 18a4 4 0 0 0-8 0"></path></svg>
                </div>`,
          className: "",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        })

        // Remove marcador anterior do entregador se existir
        if (courierMarkerRef.current) {
          map.removeLayer(courierMarkerRef.current)
        }

        // Cria novo marcador do entregador
        courierMarkerRef.current = L.marker([lastLocation.latitude, lastLocation.longitude], { icon: courierIcon })
          .addTo(map)
          .bindPopup(
            `<b>🚚 Entregador</b><br>Última atualização: ${new Date(lastLocation.timestamp).toLocaleTimeString()}<br>Posição: ${locations.length}ª`,
          )

        // Centraliza o mapa na posição atual do entregador com animação suave
        map.panTo([lastLocation.latitude, lastLocation.longitude], { animate: true, duration: 1 })

      }

      // Desenha o caminho percorrido apenas se houver mais de 1 ponto
      if (path.length > 1) {
        polylineRef.current = L.polyline(path, { 
          color: "#3b82f6", 
          weight: 4,
          opacity: 0.8,
          dashArray: "8, 12"
        }).addTo(map)
      }

      // Adiciona marcadores para pontos intermediários (mostrar todos)
      if (locations.length > 2) {
        locations.slice(1, -1).forEach((location, index) => {
          const waypointIcon = L.divIcon({
            html: `<div class="flex items-center justify-center bg-gray-400 text-white rounded-full p-1 border-2 border-white shadow-sm" style="width: 16px; height: 16px; font-size: 8px;">
                    ${index + 1}
                  </div>`,
            className: "",
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })

          const waypointMarker = L.marker([location.latitude, location.longitude], { icon: waypointIcon })
            .addTo(map)
            .bindPopup(
              `<b>📍 Ponto ${index + 1}</b><br>Hora: ${new Date(location.timestamp).toLocaleTimeString()}`,
            )

          markersRef.current.push(waypointMarker)
        })
      }
    }

    updateMap()
  }, [locations, destination])

  return <div ref={mapRef} className="h-full w-full" />
}
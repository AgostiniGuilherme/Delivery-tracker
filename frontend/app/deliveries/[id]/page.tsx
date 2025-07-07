"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { fetchDeliveryById, fetchDeliveryLocations } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { AppLayout } from "@/components/layouts/app-layout"
import { DeliveryDetails } from "@/components/deliveries/delivery-details"
import { EmptyState } from "@/components/ui-custom/empty-state"
import { LoadingDeliveryDetails } from "@/components/ui-custom/loading-skeletons"
import type { Delivery, Location } from "@/lib/types"

export default function DeliveryDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Desempacotar params usando React.use()
  const { id } = use(params)

  const fetchLocationsData = useCallback(async () => {
    try {
      const locationsData = await fetchDeliveryLocations(id)
      console.log('📍 Localizações carregadas:', locationsData)
      setLocations(locationsData)
    } catch (error) {
      console.error("Erro ao buscar localizações:", error)
    }
  }, [id])

  useEffect(() => {
    // Se não estiver autenticado e não estiver carregando, redireciona para login
    if (!user && !authLoading) {
      router.push("/")
      return
    }

    let ws: WebSocket | null = null
    let isUnmounted = false

    const getDeliveryData = async () => {
      try {
        const data = await fetchDeliveryById(id)
        setDelivery(data)
        await fetchLocationsData()
      } catch (error) {
        console.error("Erro ao buscar detalhes da entrega:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      getDeliveryData()

      // WebSocket para atualizações em tempo real
      ws = new window.WebSocket(`ws://localhost:3001/api/locations/ws/${id}`)
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📡 WebSocket recebeu:', data)
          
          // Espera-se que o backend envie um array de localizações ou uma nova localização
          if (Array.isArray(data)) {
            setLocations(data)
          } else if (data && data.latitude && data.longitude) {
            setLocations((prev) => {
              // Verifica se já existe uma localização com o mesmo ID
              const exists = prev.some(loc => loc.id === data.id)
              if (exists) {
                return prev
              }
              return [...prev, data]
            })
          }
        } catch (e) {
          console.error('❌ Erro ao processar mensagem WebSocket:', e)
        }
      }
      ws.onerror = (event) => {
        // Pode logar ou tratar erro de conexão
      }

      // Polling como fallback
      const intervalId = setInterval(fetchLocationsData, 10000)

      return () => {
        isUnmounted = true
        if (ws) ws.close()
        clearInterval(intervalId)
      }
    }
  }, [id, router, fetchLocationsData, user, authLoading])

  if (authLoading) {
    return <LoadingDeliveryDetails />
  }

  return (
    <AppLayout>
      <Button variant="outline" size="sm" className="mb-6" onClick={() => router.push("/deliveries")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      {isLoading ? (
        <LoadingDeliveryDetails />
      ) : delivery ? (
        <DeliveryDetails delivery={delivery} locations={locations} />
      ) : (
        <EmptyState
          icon="package"
          title="Entrega não encontrada"
          description="A entrega que você está procurando não existe ou foi removida."
          action={
            <Button className="mt-6" onClick={() => router.push("/deliveries")}>
              Ver todas as entregas
            </Button>
          }
        />
      )}
    </AppLayout>
  )
}

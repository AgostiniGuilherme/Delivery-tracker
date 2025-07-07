"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { fetchDeliveries } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { AppLayout } from "@/components/layouts/app-layout"
import { DeliveryList } from "@/components/deliveries/delivery-list"
import { EmptyState } from "@/components/ui-custom/empty-state"
import { LoadingDeliveries } from "@/components/ui-custom/loading-skeletons"
import type { Delivery } from "@/lib/types"

export default function DeliveriesPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Se não estiver autenticado e não estiver carregando, redireciona para login
    if (!user && !authLoading) {
      router.push("/")
      return
    }

    // Buscar entregas
    const getDeliveries = async () => {
      try {
        const data = await fetchDeliveries()
        setDeliveries(data)
      } catch (error) {
        console.error("Erro ao buscar entregas:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      getDeliveries()
    }
  }, [router, user, authLoading])

  if (authLoading) {
    return <LoadingDeliveries />
  }

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Minhas Entregas</h2>
      </div>

      {isLoading ? (
        <LoadingDeliveries />
      ) : deliveries.length === 0 ? (
        <EmptyState
          icon="package"
          title="Nenhuma entrega encontrada"
          description="Suas entregas aparecerão aqui quando estiverem disponíveis."
        />
      ) : (
        <DeliveryList deliveries={deliveries} />
      )}
    </AppLayout>
  )
}

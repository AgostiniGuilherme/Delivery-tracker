"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui-custom/status-badge"
import type { Delivery } from "@/lib/types"

interface DeliveryCardProps {
  delivery: Delivery
}

export function DeliveryCard({ delivery }: DeliveryCardProps) {
  const router = useRouter()

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex justify-between items-start">
          <span>Entrega #{delivery.id.substring(0, 8)}</span>
          <StatusBadge status={delivery.status} statusText={delivery.statusText} />
        </CardTitle>
        <CardDescription>{new Date(delivery.createdAt).toLocaleDateString("pt-BR")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium">Endereço de entrega:</p>
            <p className="text-sm text-gray-500">{delivery.address}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Produto:</p>
            <p className="text-sm text-gray-500">{delivery.productName}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" variant="outline" onClick={() => router.push(`/deliveries/${delivery.id}`)}>
          Ver detalhes
        </Button>
      </CardFooter>
    </Card>
  )
}

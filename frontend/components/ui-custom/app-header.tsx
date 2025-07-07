"use client"

import { Button } from "@/components/ui/button"
import { Package, LogOut, Home } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

interface AppHeaderProps {
  user: { name: string; email: string } | null
  onLogout: () => void
}

export function AppHeader({ user, onLogout }: AppHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isDeliveryDetails = pathname?.includes("/deliveries/") && pathname !== "/deliveries"

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <Package className="h-8 w-8 text-primary mr-2" />
          <h1 className="text-xl font-bold">Delivery Track</h1>
        </div>
        <div className="flex items-center gap-4">
          {isDeliveryDetails && (
            <Button variant="ghost" size="sm" onClick={() => router.push("/deliveries")}>
              <Home className="h-4 w-4 mr-2" />
              Voltar para entregas
            </Button>
          )}
          {user && (
            <>
              <span className="text-sm text-gray-600 hidden sm:inline">Olá, {user.name}</span>
              <Button variant="outline" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

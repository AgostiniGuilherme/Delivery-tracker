import { Badge } from "@/components/ui/badge"
import { Clock, Truck, MapPin, Package } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  statusText: string
  size?: "sm" | "md" | "lg"
}

export function StatusBadge({ status, statusText, size = "sm" }: StatusBadgeProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "pendente":
        return <Clock className={cn("h-4 w-4", size === "lg" && "h-5 w-5")} />
      case "em_transito":
        return <Truck className={cn("h-4 w-4", size === "lg" && "h-5 w-5")} />
      case "entregue":
        return <MapPin className={cn("h-4 w-4", size === "lg" && "h-5 w-5")} />
      default:
        return <Package className={cn("h-4 w-4", size === "lg" && "h-5 w-5")} />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case "pendente":
        return "bg-yellow-100 text-yellow-800"
      case "em_transito":
        return "bg-blue-100 text-blue-800"
      case "entregue":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Badge
      className={cn(
        getStatusColor(),
        "flex items-center",
        size === "lg" && "text-base px-3 py-1",
        size === "md" && "px-2 py-0.5",
      )}
      variant="outline"
    >
      {getStatusIcon()}
      <span className={cn("ml-1", size === "lg" && "ml-2")}>{statusText}</span>
    </Badge>
  )
}

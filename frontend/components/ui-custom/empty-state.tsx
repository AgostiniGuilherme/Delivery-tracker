import { Card, CardContent } from "@/components/ui/card"
import { Package, AlertCircle, Search } from "lucide-react"
import type React from "react"

interface EmptyStateProps {
  icon?: "package" | "alert" | "search"
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon = "package", title, description, action }: EmptyStateProps) {
  const getIcon = () => {
    switch (icon) {
      case "package":
        return <Package className="h-16 w-16 text-gray-400 mb-4" />
      case "alert":
        return <AlertCircle className="h-16 w-16 text-gray-400 mb-4" />
      case "search":
        return <Search className="h-16 w-16 text-gray-400 mb-4" />
      default:
        return <Package className="h-16 w-16 text-gray-400 mb-4" />
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-10">
        {getIcon()}
        <p className="text-xl font-medium text-gray-600">{title}</p>
        <p className="text-gray-500 mt-2">{description}</p>
        {action}
      </CardContent>
    </Card>
  )
}

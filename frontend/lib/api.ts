import type { Delivery, Location } from "./types"

// URL base da API (em um ambiente real, isso viria de variáveis de ambiente)
const API_BASE_URL = "http://localhost:3001/api"

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const user = JSON.parse(localStorage.getItem("user") || "{}")
  return user.token ? { Authorization: `Bearer ${user.token}` } : {}
}

// Função para buscar todas as entregas do cliente
export async function fetchDeliveries(): Promise<Delivery[]> {
  const res = await fetch(`${API_BASE_URL}/deliveries`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error("Erro ao buscar entregas")
  return res.json()
}

// Função para buscar detalhes de uma entrega específica
export async function fetchDeliveryById(id: string): Promise<Delivery> {
  const res = await fetch(`${API_BASE_URL}/deliveries/${id}`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error("Erro ao buscar detalhes da entrega")
  return res.json()
}

// Função para buscar localizações de uma entrega
export async function fetchDeliveryLocations(deliveryId: string): Promise<Location[]> {
  const res = await fetch(`${API_BASE_URL}/deliveries/${deliveryId}/locations`, {
    headers: {
      ...getAuthHeaders(),
    },
  })
  if (!res.ok) throw new Error("Erro ao buscar localizações")
  return res.json()
}

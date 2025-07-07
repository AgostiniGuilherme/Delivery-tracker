import type React from "react"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return <div className="flex items-center justify-center min-h-screen bg-gray-50">{children}</div>
}

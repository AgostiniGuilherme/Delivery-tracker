"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"
import { AuthLayout } from "@/components/layouts/auth-layout"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const res = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || "Erro ao fazer login")
        setIsLoading(false)
        return
      }
      // Armazena token e dados do usuário
      localStorage.setItem("user", JSON.stringify({ ...data.user, token: data.token }))
      setIsLoading(false)
      router.push("/deliveries")
    } catch (error) {
      alert("Erro de conexão com o servidor")
      setIsLoading(false)
    }
  }

  const handleRegister = async (name: string, email: string, password: string) => {
    setIsLoading(true)
    try {
      const res = await fetch("http://localhost:3001/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || "Erro ao registrar")
        setIsLoading(false)
        return
      }
      // Armazena token e dados do usuário
      localStorage.setItem("user", JSON.stringify({ ...data.user, token: data.token }))
      setIsLoading(false)
      router.push("/deliveries")
    } catch (error) {
      alert("Erro de conexão com o servidor")
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md flex flex-col items-center space-y-4">
        {isRegistering ? (
          <>
            <RegisterForm onSubmit={handleRegister} isLoading={isLoading} />
            <p className="text-sm text-center">
              Já tem conta?{" "}
              <button
                onClick={() => setIsRegistering(false)}
                className="text-blue-600 hover:underline"
              >
                Entrar
              </button>
            </p>
          </>
        ) : (
          <>
      <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
            <p className="text-sm text-center">
              Ainda não tem conta?{" "}
              <button
                onClick={() => setIsRegistering(true)}
                className="text-blue-600 hover:underline"
              >
                Cadastrar
              </button>
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  )
}

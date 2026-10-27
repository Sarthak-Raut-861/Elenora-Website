/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, ApiError } from './api'
import type { LoginPayload, RegisterPayload, User } from './types'

export const TOKEN_KEY = 'asset_tracking_access_token'

export interface AuthContextValue {
  token: string | null
  user: User | null
  loading: boolean
  login: (payload: LoginPayload) => Promise<User>
  register: (payload: RegisterPayload) => Promise<void>
  refreshToken: () => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function getStoredToken(): string | null {
  const val = localStorage.getItem(TOKEN_KEY)
  return val && val.length > 0 ? val : null
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken())
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }, [token])

  // Only hydrate on mount — login/logout manage user state directly
  useEffect(() => {
    async function hydrate() {
      const stored = getStoredToken()
      if (!stored) {
        setLoading(false)
        return
      }
      try {
        const me = await api.me(stored)
        setToken(stored)
        setUser(me)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setToken(null)
          setUser(null)
        }
      } finally {
        setLoading(false)
      }
    }

    void hydrate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount only

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      loading,
      login: async (payload) => {
        const res = await api.login(payload)
        localStorage.setItem(TOKEN_KEY, res.access_token)
        setToken(res.access_token)
        const me = await api.me(res.access_token)
        setUser(me)
        return me
      },
      register: async (payload) => {
        await api.register(payload)
      },
      refreshToken: async () => {
        const refreshed = await api.refresh()
        localStorage.setItem(TOKEN_KEY, refreshed.access_token)
        setToken(refreshed.access_token)
        const me = await api.me(refreshed.access_token)
        setUser(me)
      },
      logout: async () => {
        if (token) {
          await api.logout(token)
        }
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
      },
    }),
    [token, user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
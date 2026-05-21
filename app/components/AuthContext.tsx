'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

export interface FBUser {
  id: string
  name: string
  picture?: string
}

interface AuthContextType {
  user: FBUser | null
  sdkReady: boolean
  login: () => void
  logout: () => void
  getAccessToken: () => string | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  sdkReady: false,
  login: () => {},
  logout: () => {},
  getAccessToken: () => null,
})

declare global {
  interface Window {
    FB: {
      init: (config: Record<string, unknown>) => void
      getLoginStatus: (cb: (res: { status: string }) => void) => void
      getAuthResponse: () => { accessToken: string; userID: string } | null
      login: (cb: (res: { authResponse?: { accessToken: string; userID: string } }) => void, opts: { scope: string }) => void
      logout: (cb: () => void) => void
      api: (path: string, params: Record<string, string>, cb: (res: Record<string, unknown>) => void) => void
    }
    fbAsyncInit: () => void
  }
}

const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? ''

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FBUser | null>(null)
  const [sdkReady, setSdkReady] = useState(false)

  const fetchUserInfo = useCallback(() => {
    window.FB.api('/me', { fields: 'id,name,picture.type(normal)' }, (res) => {
      const fbUser: FBUser = {
        id: res.id as string,
        name: res.name as string,
        picture: (res.picture as { data?: { url?: string } } | undefined)?.data?.url,
      }
      setUser(fbUser)
      try { localStorage.setItem('fb_user', JSON.stringify(fbUser)) } catch {}
    })
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fb_user')
      if (saved) setUser(JSON.parse(saved))
    } catch {}

    if (!FB_APP_ID) return

    window.fbAsyncInit = function () {
      window.FB.init({ appId: FB_APP_ID, cookie: true, xfbml: false, version: 'v19.0' })
      window.FB.getLoginStatus((response) => {
        setSdkReady(true)
        if (response.status === 'connected') fetchUserInfo()
      })
    }

    if (!document.getElementById('fb-sdk')) {
      const script = document.createElement('script')
      script.id = 'fb-sdk'
      script.src = 'https://connect.facebook.net/vi_VN/sdk.js'
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }
  }, [fetchUserInfo])

  function login() {
    if (typeof window === 'undefined' || !window.FB) return
    window.FB.login((response) => {
      if (response.authResponse) fetchUserInfo()
    }, { scope: 'public_profile' })
  }

  function logout() {
    if (typeof window !== 'undefined' && window.FB) {
      try { window.FB.logout(() => {}) } catch {}
    }
    setUser(null)
    try {
      localStorage.removeItem('fb_user')
      localStorage.removeItem('fb_user_phone')
    } catch {}
  }

  function getAccessToken(): string | null {
    if (typeof window === 'undefined' || !window.FB) return null
    try {
      return window.FB.getAuthResponse()?.accessToken ?? null
    } catch {
      return null
    }
  }

  return (
    <AuthContext.Provider value={{ user, sdkReady, login, logout, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

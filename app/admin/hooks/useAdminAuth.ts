'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'moshavi_admin_token'

interface AdminAuthState {
    authToken: string | null
    isAuthenticated: boolean | null
    message: string | null
    setMessage: (msg: string | null) => void
    logout: () => void
}

function verifyToken(bearerToken: string): Promise<boolean> {
    return fetch('/api/admin', { headers: { 'Authorization': bearerToken } })
        .then(res => res.ok)
        .catch(() => false)
}

export function useAdminAuth(): AdminAuthState {
    const [authToken, setAuthToken] = useState<string | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        const tryStored = () => {
            if (typeof window === 'undefined') return
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                verifyToken(stored).then(ok => {
                    if (cancelled) return
                    if (ok) {
                        setAuthToken(stored)
                        setIsAuthenticated(true)
                    } else {
                        localStorage.removeItem(STORAGE_KEY)
                        promptAndVerify()
                    }
                })
                return
            }
            promptAndVerify()
        }

        function promptAndVerify() {
            if (cancelled) return
            const token = prompt('Enter admin password')
            if (!token) {
                setIsAuthenticated(false)
                setMessage('Password required')
                return
            }
            const bearerToken = `Bearer ${token.trim()}`
            setAuthToken(bearerToken)
            verifyToken(bearerToken).then(ok => {
                if (cancelled) return
                if (ok) {
                    localStorage.setItem(STORAGE_KEY, bearerToken)
                    setIsAuthenticated(true)
                } else {
                    setAuthToken(null)
                    setIsAuthenticated(false)
                    setMessage('Invalid password')
                }
            }).catch(() => {
                if (cancelled) return
                setAuthToken(null)
                setIsAuthenticated(false)
                setMessage('Authentication failed')
            })
        }

        tryStored()
        return () => { cancelled = true }
    }, [])

    const setMessageCb = useCallback((msg: string | null) => setMessage(msg), [])

    const logout = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(STORAGE_KEY)
        }
        setAuthToken(null)
        setIsAuthenticated(false)
        setMessage(null)
        window.location.reload()
    }, [])

    return { authToken, isAuthenticated, message, setMessage: setMessageCb, logout }
}

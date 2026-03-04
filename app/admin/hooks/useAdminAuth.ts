'use client'

import { useState, useEffect, useCallback } from 'react'

interface AdminAuthState {
    authToken: string | null
    isAuthenticated: boolean | null
    message: string | null
    setMessage: (msg: string | null) => void
}

export function useAdminAuth(): AdminAuthState {
    const [authToken, setAuthToken] = useState<string | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    useEffect(() => {
        const token = prompt('Enter admin password')
        if (token) {
            const bearerToken = `Bearer ${token}`
            setAuthToken(bearerToken)
            fetch('/api/admin', {
                headers: { 'Authorization': bearerToken },
            }).then(res => {
                if (res.ok) {
                    setIsAuthenticated(true)
                } else {
                    setIsAuthenticated(false)
                    setMessage('Invalid password')
                }
            }).catch(() => {
                setIsAuthenticated(false)
                setMessage('Authentication failed')
            })
        } else {
            setIsAuthenticated(false)
            setMessage('Password required')
        }
    }, [])

    const setMessageCb = useCallback((msg: string | null) => setMessage(msg), [])

    return { authToken, isAuthenticated, message, setMessage: setMessageCb }
}

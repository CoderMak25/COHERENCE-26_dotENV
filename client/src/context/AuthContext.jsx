import { createContext, useContext, useState, useEffect } from 'react'
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInAnonymously,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from 'firebase/auth'
import { auth } from '../config/firebase'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // If Firebase failed to init, skip subscribing and treat as logged-out
        if (!auth) {
            setLoading(false)
            return
        }

        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser)
            setLoading(false)
        })
        return () => unsubscribe()
    }, [])

    const login = (email, password) => {
        if (!auth) {
            return Promise.reject(new Error('Auth is not configured'))
        }
        return signInWithEmailAndPassword(auth, email, password)
    }

    const loginWithGoogle = () => {
        if (!auth) {
            return Promise.reject(new Error('Auth is not configured'))
        }
        const provider = new GoogleAuthProvider()
        return signInWithPopup(auth, provider)
    }

    const loginDemo = async () => {
        // Prefer Firebase anonymous auth when available
        if (auth) {
            try {
                await signInAnonymously(auth)
                return
            } catch (err) {
                console.warn('Demo login via Firebase failed, falling back to local demo user:', err.message)
            }
        }
        // Fallback: local in-memory demo user so dashboard works without Firebase setup
        setUser({ uid: 'demo-user', displayName: 'Demo User', isDemo: true })
    }

    const logout = () => {
        if (!auth) {
            setUser(null)
            return Promise.resolve()
        }
        return signOut(auth)
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, loginDemo, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)

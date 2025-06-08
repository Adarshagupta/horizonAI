'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { User } from '@/types'

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string, role: 'admin' | 'agent') => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithGoogleRedirect: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Handle redirect result on page load
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth)
        if (result?.user) {
          const userDoc = await getDoc(doc(db, 'users', result.user.uid))
          if (!userDoc.exists()) {
            const userData = {
              name: result.user.displayName || 'Unknown',
              role: 'admin',
              email: result.user.email!,
              businessId: result.user.uid, // Use user ID as business ID for individual accounts
              createdAt: new Date(),
              updatedAt: new Date(),
            }
            await setDoc(doc(db, 'users', result.user.uid), userData)
          }
        }
      } catch (error) {
        console.error('Error handling redirect result:', error)
      }
    }

    handleRedirectResult()

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser)
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              name: userData.name,
              role: userData.role,
              businessId: userData.businessId || firebaseUser.uid, // Fallback to user ID if no businessId
              createdAt: userData.createdAt?.toDate() || new Date(),
              updatedAt: userData.updatedAt?.toDate() || new Date(),
            })
          } else {
            // Create user document if it doesn't exist
            const userData = {
              name: firebaseUser.displayName || 'User',
              role: 'admin' as const,
              email: firebaseUser.email!,
              businessId: firebaseUser.uid,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
            await setDoc(doc(db, 'users', firebaseUser.uid), userData)
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              name: userData.name,
              role: userData.role,
              businessId: userData.businessId,
              createdAt: userData.createdAt,
              updatedAt: userData.updatedAt,
            })
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
        }
      } else {
        setUser(null)
      }
      
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      throw error
    }
  }

  const signUp = async (email: string, password: string, name: string, role: 'admin' | 'agent') => {
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password)
      
      const userData = {
        name,
        role,
        email,
        businessId: firebaseUser.uid, // Use user ID as business ID for individual accounts
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      await setDoc(doc(db, 'users', firebaseUser.uid), userData)
    } catch (error) {
      throw error
    }
  }

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        prompt: 'select_account'
      })
      
      // Try popup first, but automatically fall back to redirect on COOP errors
      try {
        const { user: firebaseUser } = await signInWithPopup(auth, provider)
        
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (!userDoc.exists()) {
          const userData = {
            name: firebaseUser.displayName || 'Unknown',
            role: 'admin',
            email: firebaseUser.email!,
            businessId: firebaseUser.uid, // Use user ID as business ID for individual accounts
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          
          await setDoc(doc(db, 'users', firebaseUser.uid), userData)
        }
      } catch (popupError: any) {
        // If popup fails due to COOP or blocking, automatically use redirect
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.message?.includes('Cross-Origin-Opener-Policy') ||
            popupError.message?.includes('popup')) {
          console.log('Popup blocked, falling back to redirect...')
          await signInWithRedirect(auth, provider)
          return // Redirect will handle the rest
        }
        throw popupError
      }
    } catch (error: any) {
      // Handle other authentication errors
      throw error
    }
  }

  const signInWithGoogleRedirect = async () => {
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        prompt: 'select_account'
      })
      await signInWithRedirect(auth, provider)
      // The user will be redirected, so no further action needed here
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      throw error
    }
  }

  const value = {
    user,
    firebaseUser,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithGoogleRedirect,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 
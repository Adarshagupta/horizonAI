import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth'
import { auth } from './firebase'

export interface AuthResult {
  success: boolean
  user?: any
  error?: string
  method?: 'popup' | 'redirect' | 'manual'
}

export class RobustGoogleAuth {
  private provider: GoogleAuthProvider

  constructor() {
    this.provider = new GoogleAuthProvider()
    this.provider.setCustomParameters({
      prompt: 'select_account'
    })
  }

  async authenticate(): Promise<AuthResult> {
    // Method 1: Try popup first
    try {
      console.log('Attempting popup authentication...')
      const result = await signInWithPopup(auth, this.provider)
      return {
        success: true,
        user: result.user,
        method: 'popup'
      }
    } catch (popupError: any) {
      console.log('Popup failed:', popupError.code, popupError.message)
      
      // Check if it's a COOP/popup blocking error
      if (this.isPopupBlockedError(popupError)) {
        return await this.fallbackToRedirect()
      }
      
      // If it's not a blocking error, throw it
      throw popupError
    }
  }

  private isPopupBlockedError(error: any): boolean {
    const blockedCodes = [
      'auth/popup-blocked',
      'auth/popup-closed-by-user',
      'auth/cancelled-popup-request'
    ]
    
    const blockedMessages = [
      'Cross-Origin-Opener-Policy',
      'popup',
      'blocked',
      'closed'
    ]
    
    return blockedCodes.includes(error.code) || 
           blockedMessages.some(msg => error.message?.toLowerCase().includes(msg.toLowerCase()))
  }

  private async fallbackToRedirect(): Promise<AuthResult> {
    try {
      console.log('Falling back to redirect authentication...')
      await signInWithRedirect(auth, this.provider)
      return {
        success: true,
        method: 'redirect'
      }
    } catch (redirectError: any) {
      console.error('Redirect also failed:', redirectError)
      return {
        success: false,
        error: 'Both popup and redirect authentication failed. Please try email/password authentication.',
        method: 'redirect'
      }
    }
  }

  // Alternative approach using a new window with manual handling
  async authenticateWithManualWindow(): Promise<AuthResult> {
    return new Promise((resolve) => {
      const authUrl = this.buildAuthUrl()
      const popup = window.open(
        authUrl,
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      if (!popup) {
        resolve({
          success: false,
          error: 'Popup was blocked. Please enable popups for this site.',
          method: 'manual'
        })
        return
      }

      // Poll for completion
      const pollTimer = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(pollTimer)
            resolve({
              success: false,
              error: 'Authentication was cancelled.',
              method: 'manual'
            })
            return
          }

          // Check if we can access the popup URL (same origin)
          try {
            if (popup.location.origin === window.location.origin) {
              const urlParams = new URLSearchParams(popup.location.search)
              const code = urlParams.get('code')
              
              if (code) {
                clearInterval(pollTimer)
                popup.close()
                resolve({
                  success: true,
                  method: 'manual'
                })
              }
            }
          } catch (e) {
            // Cross-origin access denied, continue polling
          }
        } catch (e) {
          clearInterval(pollTimer)
          resolve({
            success: false,
            error: 'Authentication failed due to security restrictions.',
            method: 'manual'
          })
        }
      }, 1000)

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollTimer)
        if (!popup.closed) {
          popup.close()
        }
        resolve({
          success: false,
          error: 'Authentication timed out.',
          method: 'manual'
        })
      }, 300000)
    })
  }

  private buildAuthUrl(): string {
    const clientId = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com'
    const redirectUri = `${window.location.origin}/auth/callback`
    const scope = 'openid email profile'
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope,
      response_type: 'code',
      prompt: 'select_account'
    })

    return `https://accounts.google.com/o/oauth2/auth?${params.toString()}`
  }
}

export const googleAuth = new RobustGoogleAuth() 
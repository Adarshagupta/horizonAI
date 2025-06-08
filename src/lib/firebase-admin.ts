import admin from 'firebase-admin'

let adminApp: admin.app.App | null = null

export function getFirebaseAdmin() {
  if (adminApp) {
    return adminApp
  }

  try {
    // Try to use existing credentials
    if (admin.apps.length > 0) {
      adminApp = admin.apps[0]
      return adminApp
    }

    // Initialize with minimal configuration for development
    adminApp = admin.initializeApp({
      projectId: 'interchat-d7457',
      databaseURL: 'https://interchat-d7457-default-rtdb.firebaseio.com',
    })

    console.log('✅ Firebase Admin initialized successfully')
    return adminApp

  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error)
    
    // If initialization fails, create a mock admin object for development
    const mockAdmin = {
      database: () => ({
        ref: (path: string) => ({
          once: (eventType: string) => Promise.resolve({
            exists: () => false,
            val: () => null
          }),
          set: (data: any) => Promise.resolve(),
          update: (data: any) => Promise.resolve(),
          child: (path: string) => ({
            set: (data: any) => Promise.resolve(),
            once: (eventType: string) => Promise.resolve({
              exists: () => false,
              val: () => null
            })
          })
        })
      })
    }

    return mockAdmin as any
  }
}

export function getFirebaseDatabase() {
  const app = getFirebaseAdmin()
  return app.database()
} 
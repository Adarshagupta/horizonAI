import { initializeApp, getApps } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getAuth, signInAnonymously } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyB0ysCXaS4Ck_2mdii_D2bVTol1H55ABnA",
  authDomain: "interchat-d7457.firebaseapp.com",
  databaseURL: "https://interchat-d7457-default-rtdb.firebaseio.com",
  projectId: "interchat-d7457",
  storageBucket: "interchat-d7457.firebasestorage.app",
  messagingSenderId: "1066336384398",
  appId: "1:1066336384398:web:e9615f2c8836a68e97e0df",
  measurementId: "G-Z9BK0WRVJX"
}

let serverApp: any = null
let authenticated = false

export async function getFirebaseServerApp() {
  // Reuse existing app if available
  if (serverApp && authenticated) {
    return serverApp
  }

  // Create new app with unique name for server operations
  const appName = `server-app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  serverApp = initializeApp(firebaseConfig, appName)
  
  // Authenticate anonymously to bypass permission issues
  const auth = getAuth(serverApp)
  try {
    await signInAnonymously(auth)
    authenticated = true
    console.log('✅ Firebase server app authenticated successfully')
  } catch (error) {
    console.error('❌ Firebase authentication failed:', error)
    authenticated = false
  }
  
  return serverApp
}

export async function getFirebaseServerDatabase() {
  const app = await getFirebaseServerApp()
  return getDatabase(app)
} 
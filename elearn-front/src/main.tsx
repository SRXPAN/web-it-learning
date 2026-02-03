import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './auth/AuthContext'
import { fetchCsrfToken } from './lib/http'

// Pre-fetch CSRF token before rendering to avoid race conditions
fetchCsrfToken().catch(err => console.warn('Initial CSRF fetch failed:', err))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Future flags are optional but recommended for easier migration to React Router v7.
      If you are using React Router v6.x, these flags enable v7 behavior early.
    */}
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
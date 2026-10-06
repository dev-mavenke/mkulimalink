import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeProvider'
import { AuthProvider } from '@/context/AuthProvider'
import { MarketProvider } from '@/context/MarketProvider'
import App from '@/App'
import '@/styles/app.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          {/* Above the router because the board is on the landing page, the
              market, a lot's own page, the dashboard and the sign-in panel —
              fetching it per route would refetch it on every navigation. */}
          <MarketProvider>
            <App />
          </MarketProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)

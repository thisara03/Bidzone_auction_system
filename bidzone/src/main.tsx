import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { I18nProvider } from './context/I18nContext'
import { ListingsProvider } from './context/ListingsContext'
import { WishlistProvider } from './context/WishlistContext'
import { CartProvider } from './context/CartContext'
import { SavedCardsProvider } from './context/SavedCardsContext'
import { NotificationsProvider } from './context/NotificationsContext'
import { HelpProvider } from './context/HelpContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <ListingsProvider>
          <WishlistProvider>
            <CartProvider>
              <SavedCardsProvider>
                <NotificationsProvider>
                  <HelpProvider>
                    <AuthProvider>
                      <App />
                    </AuthProvider>
                  </HelpProvider>
                </NotificationsProvider>
              </SavedCardsProvider>
            </CartProvider>
          </WishlistProvider>
        </ListingsProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
)

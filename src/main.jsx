import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// `?display=1` opens the read-only second-screen warzone instead of the game.
// It is lazy-loaded so Three.js lands in its own chunk — the game window (the
// primary surface) never downloads the 3D scene.
const isDisplayWindow = new URLSearchParams(window.location.search).get('display') === '1'

const DisplayScreen = isDisplayWindow
  ? lazy(() => import('./components/Display/DisplayScreen.jsx'))
  : null

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isDisplayWindow ? (
      <Suspense
        fallback={
          <div
            style={{
              minHeight: '100vh',
              display: 'grid',
              placeItems: 'center',
              background: '#0b0f13',
              color: '#8b949e',
              fontFamily: 'system-ui, sans-serif',
              letterSpacing: '3px',
              fontSize: '12px',
            }}
          >
            MUSTERING THE ARMIES…
          </div>
        }
      >
        <DisplayScreen />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppSimple from './AppSimple.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AppSimple />
    </ErrorBoundary>
  </StrictMode>,
)

import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { useReconnect } from '@/hooks/useReconnect'
import { useAudio } from '@/hooks/useAudio'
import JoinView from '@/pages/JoinView'
import PlayerView from '@/pages/PlayerView'
import DashboardView from '@/pages/DashboardView'
import ErrorBoundary from '@/components/shared/ErrorBoundary'

function App() {
  // Initialize socket connection
  useSocket()
  
  // Initialize reconnection logic
  useReconnect()
  
  // Preload audio
  const { isPreloaded } = useAudio()

  useEffect(() => {
    if (isPreloaded) {
      console.log('✅ All audio preloaded')
    }
  }, [isPreloaded])

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/join" replace />} />
        <Route path="/join" element={<JoinView />} />
        <Route path="/player" element={<PlayerView />} />
        <Route path="/dashboard" element={<DashboardView />} />
        <Route path="*" element={<Navigate to="/join" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default App
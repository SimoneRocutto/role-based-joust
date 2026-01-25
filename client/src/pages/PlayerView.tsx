import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameState } from '@/hooks/useGameState'
import { useGameStore } from '@/store/gameStore'
import { useAccelerometer } from '@/hooks/useAccelerometer'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useFullscreen } from '@/hooks/useFullscreen'
import { useAudio } from '@/hooks/useAudio'
import { socketService } from '@/services/socket'
import { requestMotionPermission } from '@/utils/permissions'
import PlayerNumber from '@/components/player/PlayerNumber'
import HealthBackground from '@/components/player/HealthBackground'
import StatusEffects from '@/components/player/StatusEffects'
import TargetDisplay from '@/components/player/TargetDisplay'
import ConnectionStatus from '@/components/player/ConnectionStatus'
import PortraitLock from '@/components/player/PortraitLock'

function PlayerView() {
  const navigate = useNavigate()
  const [permissionsGranted, setPermissionsGranted] = useState(false)
  const [showPortraitLock, setShowPortraitLock] = useState(false)

  const {
    myPlayerId,
    myPlayerNumber,
    myPlayer,
    myTarget,
    myRole,
    isWaiting,
    isCountdown,
    isMyPlayerDead
  } = useGameState()

  const { countdownSeconds, countdownPhase } = useGameStore()

  const { play } = useAudio()
  const { start: startAccelerometer, lastData } = useAccelerometer()
  const { enable: enableWakeLock } = useWakeLock(true)
  const { enter: enterFullscreen } = useFullscreen()

  // Check if player has joined
  useEffect(() => {
    const playerId = localStorage.getItem('playerId')
    const playerNumber = localStorage.getItem('playerNumber')

    if (!playerId || !playerNumber) {
      // Not joined, redirect to join page
      navigate('/join')
    }
  }, [navigate])

  // Request permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      // Request motion permission
      const motionGranted = await requestMotionPermission()
      if (!motionGranted) {
        alert('Motion permission denied. Game cannot function without accelerometer access.')
        return
      }

      // Enable wake lock
      await enableWakeLock()

      // Try to enter fullscreen
      await enterFullscreen()

      setPermissionsGranted(true)

      // Start accelerometer
      startAccelerometer()
    }

    requestPermissions()
  }, [])

  // Send accelerometer data
  useEffect(() => {
    if (!lastData || !myPlayerId || !permissionsGranted) return

    socketService.sendMovement({
      playerId: myPlayerId,
      x: lastData.x,
      y: lastData.y,
      z: lastData.z,
      timestamp: lastData.timestamp,
      deviceType: 'phone'
    })
  }, [lastData, myPlayerId, permissionsGranted])

  // Detect orientation for portrait lock
  useEffect(() => {
    const checkOrientation = () => {
      const isLandscape = window.innerWidth > window.innerHeight
      setShowPortraitLock(isLandscape && window.innerWidth < 1024)
    }

    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)

    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])

  // Play damage sound when taking damage
  useEffect(() => {
    if (!myPlayer) return

    // Check if player took damage (simplified - in real app track previous damage)
    if (myPlayer.accumulatedDamage > 0) {
      play('effects/damage', { volume: 0.3 })
    }
  }, [myPlayer?.accumulatedDamage])

  if (!myPlayerNumber || !myPlayerId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="player-view relative w-screen h-screen overflow-hidden">
      {/* Portrait Lock Overlay */}
      {showPortraitLock && <PortraitLock />}

      {/* Waiting State */}
      {isWaiting && !isCountdown && (
        <div className="fullscreen bg-gray-800 flex flex-col items-center justify-center gap-8 p-8">
          <ConnectionStatus />
          <div className="text-center">
            <div className="text-8xl font-bold text-white mb-4">
              #{myPlayerNumber}
            </div>
            <div className="text-3xl text-gray-300 mb-2">
              {myPlayer?.name || 'Player'}
            </div>
            <div className="text-2xl text-gray-500">
              WAITING FOR GAME START
            </div>
          </div>
        </div>
      )}

      {/* Countdown State - Role Reveal */}
      {isCountdown && (
        <div className="fullscreen bg-gray-900 flex flex-col items-center justify-center gap-6 p-8">
          <ConnectionStatus />

          {/* Show role info if assigned */}
          {myRole ? (
            <div className="text-center">
              <div className="text-xl text-gray-400 mb-2">You are the</div>
              <div className="text-5xl font-bold text-yellow-400 mb-4">
                {myRole.displayName}
              </div>
              <div className="text-lg text-gray-300 mb-8 max-w-md">
                {myRole.description}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-3xl text-gray-300 mb-2">
                {myPlayer?.name || 'Player'}
              </div>
              <div className="text-xl text-gray-500">
                Preparing game...
              </div>
            </div>
          )}

          {/* Countdown display */}
          <div className="text-center">
            {countdownPhase === 'countdown' && countdownSeconds > 3 && (
              <div className="text-6xl font-bold text-white">
                {countdownSeconds}
              </div>
            )}
            {countdownPhase === 'countdown' && countdownSeconds <= 3 && countdownSeconds > 0 && (
              <div className="text-9xl font-black text-yellow-400 animate-bounce">
                {countdownSeconds}
              </div>
            )}
            {countdownPhase === 'go' && (
              <div className="text-9xl font-black text-green-400 animate-pulse">
                GO!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Game State */}
      {!isWaiting && !isMyPlayerDead && myPlayer && (
        <div className="fullscreen flex flex-col">
          {/* Status Bar (5%) */}
          <div className="h-[5%] flex items-center justify-between px-4 bg-black/50">
            <ConnectionStatus />
            <div className="text-sm text-gray-400">
              {Math.round((1 - myPlayer.accumulatedDamage / 100) * 100)}%
            </div>
          </div>

          {/* Main Number Area (70%) */}
          <div className="h-[70%] relative">
            <HealthBackground player={myPlayer} />
            <PlayerNumber number={myPlayerNumber} />
          </div>

          {/* Info Bar (25%) */}
          <div className="h-[25%] bg-gray-900 p-4 flex flex-col justify-between">
            <StatusEffects effects={myPlayer.statusEffects} />
            {myTarget && <TargetDisplay target={myTarget} />}
            <div className="text-right text-gray-400 text-lg">
              Pts: {myPlayer.points}
            </div>
          </div>
        </div>
      )}

      {/* Dead State */}
      {isMyPlayerDead && (
        <div className="fullscreen bg-health-dead flex flex-col items-center justify-center gap-8 dead-screen">
          <div className="text-9xl">💀</div>
          <div className="text-5xl font-bold text-gray-500">ELIMINATED</div>
          <div className="text-xl text-gray-600">
            Final Score: {myPlayer?.points || 0} pts
          </div>
        </div>
      )}
    </div>
  )
}

export default PlayerView
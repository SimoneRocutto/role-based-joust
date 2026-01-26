import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameState } from '@/hooks/useGameState'
import { useGameStore } from '@/store/gameStore'
import { useAccelerometer } from '@/hooks/useAccelerometer'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useFullscreen } from '@/hooks/useFullscreen'
import { useAudio } from '@/hooks/useAudio'
import { useShakeDetection } from '@/hooks/useShakeDetection'
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
    isRoundEnded,
    isMyPlayerDead
  } = useGameState()

  const { countdownSeconds, countdownPhase, myIsReady, setMyReady } = useGameStore()

  const { play } = useAudio()
  const { start: startAccelerometer, lastData } = useAccelerometer()
  const { enable: enableWakeLock } = useWakeLock(true)
  const { enter: enterFullscreen } = useFullscreen()

  // Shake detection for ready state
  const shouldDetectShake = (isWaiting || isRoundEnded) && !myIsReady && permissionsGranted

  const handleShakeDetected = useCallback(() => {
    if (!myPlayerId || myIsReady) return

    // Mark as ready locally
    setMyReady(true)

    // Send ready event to server
    socketService.sendReady(myPlayerId)

    // Play a feedback sound (optional)
    play('effects/ready', { volume: 0.5 })
  }, [myPlayerId, myIsReady, setMyReady, play])

  const { isShaking, shakeProgress } = useShakeDetection({
    threshold: 0.5,
    requiredDuration: 500,
    cooldown: 1000,
    onShake: handleShakeDetected,
    enabled: shouldDetectShake,
  })

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

  // Reset ready state when countdown starts (new round)
  useEffect(() => {
    if (isCountdown) {
      setMyReady(false)
    }
  }, [isCountdown, setMyReady])

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

            {/* Shake to Ready UI */}
            {!myIsReady ? (
              <div className="mt-8 space-y-4">
                <div className={`text-2xl font-bold ${isShaking ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {isShaking ? 'SHAKING...' : 'SHAKE TO READY'}
                </div>

                {/* Progress bar */}
                <div className="w-48 h-3 bg-gray-700 rounded-full overflow-hidden mx-auto">
                  <div
                    className="h-full bg-yellow-400 transition-all duration-100"
                    style={{ width: `${shakeProgress * 100}%` }}
                  />
                </div>

                <div className="text-sm text-gray-500">
                  Shake your device to ready up
                </div>
              </div>
            ) : (
              <div className="mt-8 space-y-2">
                <div className="text-6xl">✓</div>
                <div className="text-2xl text-green-400 font-bold">READY!</div>
                <div className="text-gray-500">Waiting for other players...</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Countdown State - No role info shown (roles are hidden, spoken via TTS only) */}
      {isCountdown && (
        <div className="fullscreen bg-gray-900 flex flex-col items-center justify-center gap-6 p-8">
          <ConnectionStatus />

          {/* Player info without role details */}
          <div className="text-center">
            <div className="text-8xl font-bold text-white mb-4">
              #{myPlayerNumber}
            </div>
            <div className="text-3xl text-gray-300 mb-2">
              {myPlayer?.name || 'Player'}
            </div>
            <div className="text-xl text-gray-500 mb-8">
              Get ready...
            </div>
          </div>

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

      {/* Round Ended State - Shake to ready for next round */}
      {isRoundEnded && !isCountdown && (
        <div className="fullscreen bg-gray-800 flex flex-col items-center justify-center gap-8 p-8">
          <ConnectionStatus />
          <div className="text-center">
            <div className="text-4xl text-gray-400 mb-4">ROUND OVER</div>
            <div className="text-8xl font-bold text-white mb-4">
              #{myPlayerNumber}
            </div>
            <div className="text-3xl text-gray-300 mb-2">
              {myPlayer?.name || 'Player'}
            </div>
            <div className="text-xl text-gray-400 mb-4">
              Score: {myPlayer?.points || 0} pts
            </div>

            {/* Shake to Ready UI */}
            {!myIsReady ? (
              <div className="mt-8 space-y-4">
                <div className={`text-2xl font-bold ${isShaking ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {isShaking ? 'SHAKING...' : 'SHAKE FOR NEXT ROUND'}
                </div>

                {/* Progress bar */}
                <div className="w-48 h-3 bg-gray-700 rounded-full overflow-hidden mx-auto">
                  <div
                    className="h-full bg-yellow-400 transition-all duration-100"
                    style={{ width: `${shakeProgress * 100}%` }}
                  />
                </div>

                <div className="text-sm text-gray-500">
                  Shake your device to ready up
                </div>
              </div>
            ) : (
              <div className="mt-8 space-y-2">
                <div className="text-6xl">✓</div>
                <div className="text-2xl text-green-400 font-bold">READY!</div>
                <div className="text-gray-500">Waiting for other players...</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Game State */}
      {!isWaiting && !isRoundEnded && !isMyPlayerDead && myPlayer && (
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

      {/* Dead State - only show when not in countdown (countdown takes precedence for new round) */}
      {isMyPlayerDead && !isCountdown && (
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
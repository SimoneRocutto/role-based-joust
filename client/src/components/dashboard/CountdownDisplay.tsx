import { useGameStore } from '@/store/gameStore'

function CountdownDisplay() {
  const { countdownSeconds, countdownPhase } = useGameStore()

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="text-center">
        {countdownPhase === 'countdown' && countdownSeconds > 3 && (
          <>
            <div className="text-2xl text-gray-400 mb-4">Get ready...</div>
            <div className="text-9xl font-bold text-white animate-pulse">
              {countdownSeconds}
            </div>
            <div className="text-xl text-gray-400 mt-4">
              Listen for your role instructions
            </div>
          </>
        )}

        {countdownPhase === 'countdown' && countdownSeconds <= 3 && countdownSeconds > 0 && (
          <div className="text-[200px] font-black text-yellow-400 animate-bounce">
            {countdownSeconds}
          </div>
        )}

        {countdownPhase === 'go' && (
          <div className="text-[180px] font-black text-green-400 animate-pulse">
            GO!
          </div>
        )}
      </div>
    </div>
  )
}

export default CountdownDisplay

import { useGameStore } from '@/store/gameStore'

function ReadyCounter() {
  const { readyCount } = useGameStore()
  const { ready, total } = readyCount

  const allReady = total > 0 && ready === total
  const someReady = ready > 0

  return (
    <div
      className={`
        px-4 py-2 rounded-lg text-xl font-semibold
        ${allReady
          ? 'bg-green-600 text-white'
          : someReady
            ? 'bg-yellow-600 text-white'
            : 'bg-gray-700 text-gray-300'
        }
      `}
    >
      {ready}/{total} Ready
    </div>
  )
}

export default ReadyCounter

import { useEffect, useState } from 'react'
import { getPlayerNumberSize } from '@/utils/formatters'

interface PlayerNumberProps {
  number: number
}

function PlayerNumber({ number }: PlayerNumberProps) {
  const [fontSize, setFontSize] = useState('220px')

  useEffect(() => {
    const updateSize = () => {
      setFontSize(getPlayerNumberSize(window.innerWidth))
    }

    updateSize()
    window.addEventListener('resize', updateSize)

    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="font-black text-white select-none"
        style={{ fontSize, lineHeight: 1 }}
      >
        {number}
      </div>
    </div>
  )
}

export default PlayerNumber
import { RotateCcw } from 'lucide-react'

function PortraitLock() {
  return (
    <div className="portrait-lock">
      <div className="flex flex-col items-center gap-6 text-white">
        <RotateCcw className="w-24 h-24 animate-spin" style={{ animationDuration: '2s' }} />
        <div className="text-3xl font-bold text-center">
          ROTATE TO PORTRAIT
        </div>
        <div className="text-xl text-gray-400 text-center max-w-md">
          Please rotate your device to portrait orientation to play
        </div>
      </div>
    </div>
  )
}

export default PortraitLock
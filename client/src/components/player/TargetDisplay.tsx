interface TargetDisplayProps {
  target: {
    number: number
    name: string
  }
}

function TargetDisplay({ target }: TargetDisplayProps) {
  return (
    <div className="flex items-center gap-2 text-xl text-white">
      <span className="text-2xl">🎯</span>
      <span>Target: #{target.number}</span>
    </div>
  )
}

export default TargetDisplay
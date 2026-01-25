interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-12 h-12 border-4',
    lg: 'w-16 h-16 border-4'
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`
          ${sizeClasses[size]}
          border-blue-600 border-t-transparent
          rounded-full animate-spin
        `}
      />
      {text && <p className="text-gray-400 text-lg">{text}</p>}
    </div>
  )
}

export default LoadingSpinner
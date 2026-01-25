interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
}

function Logo({ size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl'
  }

  return (
    <h1 className={`${sizeClasses[size]} font-bold tracking-wider text-white`}>
      EXTENDED JOUST
    </h1>
  )
}

export default Logo
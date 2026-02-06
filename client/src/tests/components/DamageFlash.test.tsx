import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import DamageFlash from '@/components/player/DamageFlash'

describe('DamageFlash', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing initially when damage is 0', () => {
    const { queryByTestId } = render(<DamageFlash accumulatedDamage={0} />)
    expect(queryByTestId('damage-flash')).toBeNull()
  })

  it('renders nothing initially when damage is non-zero (first render)', () => {
    // On first render, there's no "increase" — the ref starts at the initial value
    const { queryByTestId } = render(<DamageFlash accumulatedDamage={20} />)
    expect(queryByTestId('damage-flash')).toBeNull()
  })

  it('shows flash when damage increases', () => {
    const { rerender, queryByTestId } = render(<DamageFlash accumulatedDamage={0} />)
    expect(queryByTestId('damage-flash')).toBeNull()

    rerender(<DamageFlash accumulatedDamage={10} />)
    expect(queryByTestId('damage-flash')).not.toBeNull()
    expect(queryByTestId('damage-flash')).toHaveClass('damage-flash')
  })

  it('flash disappears after timeout', () => {
    vi.useFakeTimers()

    const { rerender, queryByTestId } = render(<DamageFlash accumulatedDamage={0} />)
    rerender(<DamageFlash accumulatedDamage={10} />)
    expect(queryByTestId('damage-flash')).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(queryByTestId('damage-flash')).toBeNull()

    vi.useRealTimers()
  })

  it('does not flash when damage stays the same', () => {
    const { rerender, queryByTestId } = render(<DamageFlash accumulatedDamage={10} />)
    expect(queryByTestId('damage-flash')).toBeNull()

    rerender(<DamageFlash accumulatedDamage={10} />)
    expect(queryByTestId('damage-flash')).toBeNull()
  })

  it('does not flash when damage decreases (round reset)', () => {
    vi.useFakeTimers()

    const { rerender, queryByTestId } = render(<DamageFlash accumulatedDamage={50} />)

    // Damage decreases (e.g. new round resets damage)
    rerender(<DamageFlash accumulatedDamage={0} />)
    expect(queryByTestId('damage-flash')).toBeNull()

    vi.useRealTimers()
  })

  it('flashes again on subsequent damage increases', () => {
    vi.useFakeTimers()

    const { rerender, queryByTestId } = render(<DamageFlash accumulatedDamage={0} />)

    // First damage
    rerender(<DamageFlash accumulatedDamage={10} />)
    expect(queryByTestId('damage-flash')).not.toBeNull()

    // Wait for flash to end
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(queryByTestId('damage-flash')).toBeNull()

    // Second damage
    rerender(<DamageFlash accumulatedDamage={25} />)
    expect(queryByTestId('damage-flash')).not.toBeNull()

    vi.useRealTimers()
  })

  it('has pointer-events-none so taps pass through', () => {
    const { rerender, queryByTestId } = render(<DamageFlash accumulatedDamage={0} />)
    rerender(<DamageFlash accumulatedDamage={10} />)

    expect(queryByTestId('damage-flash')).toHaveClass('pointer-events-none')
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from '@testing-library/react'
import CountdownDisplay from '@/components/dashboard/CountdownDisplay'
import { useGameStore } from '@/store/gameStore'

describe('CountdownDisplay', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
  })

  describe('early countdown phase (> 3 seconds)', () => {
    it('shows "Get ready..." message', () => {
      act(() => {
        useGameStore.getState().setCountdown(5, 'countdown')
      })

      render(<CountdownDisplay />)

      expect(screen.getByText('Get ready...')).toBeInTheDocument()
    })

    it('shows countdown number', () => {
      act(() => {
        useGameStore.getState().setCountdown(8, 'countdown')
      })

      render(<CountdownDisplay />)

      expect(screen.getByText('8')).toBeInTheDocument()
    })

    it('shows role instructions hint', () => {
      act(() => {
        useGameStore.getState().setCountdown(5, 'countdown')
      })

      render(<CountdownDisplay />)

      expect(screen.getByText('Listen for your role instructions')).toBeInTheDocument()
    })

    it('has pulse animation on number', () => {
      act(() => {
        useGameStore.getState().setCountdown(5, 'countdown')
      })

      render(<CountdownDisplay />)

      const number = screen.getByText('5')
      expect(number).toHaveClass('animate-pulse')
    })

    it('displays for countdown at exactly 4 seconds', () => {
      act(() => {
        useGameStore.getState().setCountdown(4, 'countdown')
      })

      render(<CountdownDisplay />)

      expect(screen.getByText('Get ready...')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
    })
  })

  describe('final countdown phase (1-3 seconds)', () => {
    it('shows large countdown numbers for 3 seconds', () => {
      act(() => {
        useGameStore.getState().setCountdown(3, 'countdown')
      })

      render(<CountdownDisplay />)

      const number = screen.getByText('3')
      expect(number).toHaveClass('text-[200px]')
      expect(number).toHaveClass('text-yellow-400')
    })

    it('shows large countdown numbers for 2 seconds', () => {
      act(() => {
        useGameStore.getState().setCountdown(2, 'countdown')
      })

      render(<CountdownDisplay />)

      const number = screen.getByText('2')
      expect(number).toHaveClass('text-[200px]')
    })

    it('shows large countdown numbers for 1 second', () => {
      act(() => {
        useGameStore.getState().setCountdown(1, 'countdown')
      })

      render(<CountdownDisplay />)

      const number = screen.getByText('1')
      expect(number).toHaveClass('text-[200px]')
    })

    it('has bounce animation', () => {
      act(() => {
        useGameStore.getState().setCountdown(3, 'countdown')
      })

      render(<CountdownDisplay />)

      const number = screen.getByText('3')
      expect(number).toHaveClass('animate-bounce')
    })

    it('does not show "Get ready..." message', () => {
      act(() => {
        useGameStore.getState().setCountdown(3, 'countdown')
      })

      render(<CountdownDisplay />)

      expect(screen.queryByText('Get ready...')).not.toBeInTheDocument()
    })

    it('does not show role instructions', () => {
      act(() => {
        useGameStore.getState().setCountdown(2, 'countdown')
      })

      render(<CountdownDisplay />)

      expect(screen.queryByText('Listen for your role instructions')).not.toBeInTheDocument()
    })
  })

  describe('go phase', () => {
    it('shows "GO!" text', () => {
      act(() => {
        useGameStore.getState().setCountdown(0, 'go')
      })

      render(<CountdownDisplay />)

      expect(screen.getByText('GO!')).toBeInTheDocument()
    })

    it('has green styling', () => {
      act(() => {
        useGameStore.getState().setCountdown(0, 'go')
      })

      render(<CountdownDisplay />)

      const goText = screen.getByText('GO!')
      expect(goText).toHaveClass('text-green-400')
    })

    it('has large font size', () => {
      act(() => {
        useGameStore.getState().setCountdown(0, 'go')
      })

      render(<CountdownDisplay />)

      const goText = screen.getByText('GO!')
      expect(goText).toHaveClass('text-[180px]')
    })

    it('has pulse animation', () => {
      act(() => {
        useGameStore.getState().setCountdown(0, 'go')
      })

      render(<CountdownDisplay />)

      const goText = screen.getByText('GO!')
      expect(goText).toHaveClass('animate-pulse')
    })

    it('does not show countdown numbers', () => {
      act(() => {
        useGameStore.getState().setCountdown(0, 'go')
      })

      render(<CountdownDisplay />)

      expect(screen.queryByText('0')).not.toBeInTheDocument()
      expect(screen.queryByText('Get ready...')).not.toBeInTheDocument()
    })
  })

  describe('overlay styling', () => {
    it('has fixed positioning', () => {
      act(() => {
        useGameStore.getState().setCountdown(5, 'countdown')
      })

      const { container } = render(<CountdownDisplay />)
      const overlay = container.firstChild as HTMLElement

      expect(overlay).toHaveClass('fixed')
      expect(overlay).toHaveClass('inset-0')
    })

    it('has dark semi-transparent background', () => {
      act(() => {
        useGameStore.getState().setCountdown(5, 'countdown')
      })

      const { container } = render(<CountdownDisplay />)
      const overlay = container.firstChild as HTMLElement

      expect(overlay).toHaveClass('bg-black/80')
    })

    it('has centered content', () => {
      act(() => {
        useGameStore.getState().setCountdown(5, 'countdown')
      })

      const { container } = render(<CountdownDisplay />)
      const overlay = container.firstChild as HTMLElement

      expect(overlay).toHaveClass('flex')
      expect(overlay).toHaveClass('items-center')
      expect(overlay).toHaveClass('justify-center')
    })

    it('has high z-index for overlay', () => {
      act(() => {
        useGameStore.getState().setCountdown(5, 'countdown')
      })

      const { container } = render(<CountdownDisplay />)
      const overlay = container.firstChild as HTMLElement

      expect(overlay).toHaveClass('z-50')
    })
  })

  describe('state transitions', () => {
    it('updates display when countdown changes', () => {
      act(() => {
        useGameStore.getState().setCountdown(5, 'countdown')
      })

      const { rerender } = render(<CountdownDisplay />)

      expect(screen.getByText('5')).toBeInTheDocument()

      act(() => {
        useGameStore.getState().setCountdown(3, 'countdown')
      })

      rerender(<CountdownDisplay />)

      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.queryByText('5')).not.toBeInTheDocument()
    })

    it('transitions from countdown to go phase', () => {
      act(() => {
        useGameStore.getState().setCountdown(1, 'countdown')
      })

      const { rerender } = render(<CountdownDisplay />)

      expect(screen.getByText('1')).toBeInTheDocument()

      act(() => {
        useGameStore.getState().setCountdown(0, 'go')
      })

      rerender(<CountdownDisplay />)

      expect(screen.getByText('GO!')).toBeInTheDocument()
      expect(screen.queryByText('1')).not.toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles countdown at exactly 0 with countdown phase', () => {
      act(() => {
        useGameStore.getState().setCountdown(0, 'countdown')
      })

      render(<CountdownDisplay />)

      // 0 in countdown phase should not show (it's <= 0 but not > 0)
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })

    it('handles large countdown values', () => {
      act(() => {
        useGameStore.getState().setCountdown(30, 'countdown')
      })

      render(<CountdownDisplay />)

      expect(screen.getByText('30')).toBeInTheDocument()
      expect(screen.getByText('Get ready...')).toBeInTheDocument()
    })
  })
})

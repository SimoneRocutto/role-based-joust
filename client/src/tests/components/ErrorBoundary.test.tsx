import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from '@/components/shared/ErrorBoundary'

// Component that throws an error
function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>Child content</div>
}

// Suppress console.error for these tests since we expect errors
const originalError = console.error
beforeEach(() => {
  console.error = vi.fn()
})

afterEach(() => {
  console.error = originalError
})

describe('ErrorBoundary', () => {
  describe('when no error occurs', () => {
    it('renders children normally', () => {
      render(
        <ErrorBoundary>
          <div>Normal content</div>
        </ErrorBoundary>
      )

      expect(screen.getByText('Normal content')).toBeInTheDocument()
    })

    it('renders multiple children', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      )

      expect(screen.getByText('First child')).toBeInTheDocument()
      expect(screen.getByText('Second child')).toBeInTheDocument()
    })
  })

  describe('when an error occurs', () => {
    it('displays error UI instead of children', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.queryByText('Child content')).not.toBeInTheDocument()
    })

    it('displays the error message', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      expect(screen.getByText('Test error message')).toBeInTheDocument()
    })

    it('displays fallback message when error has no message', () => {
      function ThrowEmpty() {
        throw new Error()
      }

      render(
        <ErrorBoundary>
          <ThrowEmpty />
        </ErrorBoundary>
      )

      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument()
    })

    it('displays a reload button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      expect(screen.getByRole('button', { name: 'Reload Page' })).toBeInTheDocument()
    })

    it('reloads page when reload button is clicked', () => {
      // Mock window.location.reload
      const reloadMock = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
      })

      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      fireEvent.click(screen.getByRole('button', { name: 'Reload Page' }))

      expect(reloadMock).toHaveBeenCalled()
    })

    it('logs error to console', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      expect(console.error).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) })
      )
    })
  })

  describe('error UI styling', () => {
    it('has full screen layout', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('min-h-screen')
      expect(wrapper).toHaveClass('bg-gray-900')
    })

    it('has centered content', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('flex')
      expect(wrapper).toHaveClass('items-center')
      expect(wrapper).toHaveClass('justify-center')
    })

    it('has error title in red', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      const title = screen.getByText('Something went wrong')
      expect(title).toHaveClass('text-red-500')
    })
  })

  describe('edge cases', () => {
    it('handles non-Error objects thrown', () => {
      function ThrowString() {
        throw 'string error' // eslint-disable-line no-throw-literal
      }

      render(
        <ErrorBoundary>
          <ThrowString />
        </ErrorBoundary>
      )

      // Should show fallback message since thrown value is not an Error
      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument()
    })

    it('handles null thrown', () => {
      function ThrowNull() {
        throw null // eslint-disable-line no-throw-literal
      }

      render(
        <ErrorBoundary>
          <ThrowNull />
        </ErrorBoundary>
      )

      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument()
    })

    it('catches errors from deeply nested children', () => {
      function DeepChild() {
        throw new Error('Deep error')
      }

      function MiddleChild() {
        return <DeepChild />
      }

      function ParentChild() {
        return <MiddleChild />
      }

      render(
        <ErrorBoundary>
          <ParentChild />
        </ErrorBoundary>
      )

      expect(screen.getByText('Deep error')).toBeInTheDocument()
    })
  })
})

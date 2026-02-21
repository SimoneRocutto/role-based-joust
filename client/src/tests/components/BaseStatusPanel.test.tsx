import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BaseStatusPanel from '@/components/dashboard/BaseStatusPanel'
import { useGameStore } from '@/store/gameStore'

vi.mock('@/services/api', () => ({
  apiService: {
    kickBase: vi.fn().mockResolvedValue({ success: true }),
  },
}))

import { apiService } from '@/services/api'

const BASE_1 = { baseId: 'base-1', baseNumber: 1, ownerTeamId: null, controlProgress: 0, isConnected: true }
const BASE_2 = { baseId: 'base-2', baseNumber: 2, ownerTeamId: 0, controlProgress: 0, isConnected: true }

describe('BaseStatusPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useGameStore.getState().reset()
  })

  it('renders nothing when there are no bases', () => {
    useGameStore.getState().setGameState('waiting')
    const { container } = render(<BaseStatusPanel />)
    expect(container.firstChild).toBeNull()
  })

  it('renders base numbers', () => {
    useGameStore.getState().setBases([BASE_1, BASE_2])
    useGameStore.getState().setGameState('waiting')
    render(<BaseStatusPanel />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows kick buttons during waiting state', () => {
    useGameStore.getState().setBases([BASE_1, BASE_2])
    useGameStore.getState().setGameState('waiting')
    render(<BaseStatusPanel />)
    const kickButtons = screen.getAllByTitle(/Kick base/)
    expect(kickButtons).toHaveLength(2)
  })

  it('shows kick buttons during pre-game state', () => {
    useGameStore.getState().setBases([BASE_1])
    useGameStore.getState().setGameState('pre-game')
    render(<BaseStatusPanel />)
    expect(screen.getByTitle('Kick base 1')).toBeInTheDocument()
  })

  it('hides kick buttons during active state', () => {
    useGameStore.getState().setBases([BASE_1])
    useGameStore.getState().setGameState('active')
    render(<BaseStatusPanel />)
    expect(screen.queryByTitle(/Kick base/)).not.toBeInTheDocument()
  })

  it('hides kick buttons during countdown state', () => {
    useGameStore.getState().setBases([BASE_1])
    useGameStore.getState().setGameState('countdown')
    render(<BaseStatusPanel />)
    expect(screen.queryByTitle(/Kick base/)).not.toBeInTheDocument()
  })

  it('hides kick buttons during round-ended state', () => {
    useGameStore.getState().setBases([BASE_1])
    useGameStore.getState().setGameState('round-ended')
    render(<BaseStatusPanel />)
    expect(screen.queryByTitle(/Kick base/)).not.toBeInTheDocument()
  })

  it('calls apiService.kickBase with correct baseId when kick button clicked', () => {
    useGameStore.getState().setBases([BASE_1, BASE_2])
    useGameStore.getState().setGameState('waiting')
    render(<BaseStatusPanel />)

    fireEvent.click(screen.getByTitle('Kick base 1'))
    expect(apiService.kickBase).toHaveBeenCalledWith('base-1')
    expect(apiService.kickBase).toHaveBeenCalledTimes(1)
  })

  it('kick button for each base calls kickBase with its own baseId', () => {
    useGameStore.getState().setBases([BASE_1, BASE_2])
    useGameStore.getState().setGameState('pre-game')
    render(<BaseStatusPanel />)

    fireEvent.click(screen.getByTitle('Kick base 2'))
    expect(apiService.kickBase).toHaveBeenCalledWith('base-2')
  })

  it('shows Offline label for disconnected bases', () => {
    const offlineBase = { ...BASE_1, isConnected: false }
    useGameStore.getState().setBases([offlineBase])
    useGameStore.getState().setGameState('waiting')
    render(<BaseStatusPanel />)
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('shows Neutral label for connected unowned bases', () => {
    useGameStore.getState().setBases([BASE_1])
    useGameStore.getState().setGameState('active')
    render(<BaseStatusPanel />)
    expect(screen.getByText('Neutral')).toBeInTheDocument()
  })
})

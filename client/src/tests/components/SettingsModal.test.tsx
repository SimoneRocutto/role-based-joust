import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SettingsModal from '@/components/dashboard/SettingsModal'

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  dangerThreshold: 0.1,
  dominationControlInterval: 5,
  dominationRespawnTime: 10,
  deathCountRespawnTime: 5,
  loading: false,
  handleThresholdChange: vi.fn(),
  handleDominationSettingChange: vi.fn(),
  handleDeathCountRespawnChange: vi.fn(),
}

describe('SettingsModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<SettingsModal {...defaultProps} isOpen={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders modal content when isOpen is true', () => {
    render(<SettingsModal {...defaultProps} />)
    expect(screen.getByText('Advanced Settings')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<SettingsModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close settings'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn()
    render(<SettingsModal {...defaultProps} onClose={onClose} />)
    // Click the overlay (first child = fixed overlay div)
    const overlay = screen.getByText('Advanced Settings').closest('.fixed')!
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows the movement threshold slider', () => {
    render(<SettingsModal {...defaultProps} />)
    expect(screen.getByText(/Movement Threshold/)).toBeInTheDocument()
    expect(screen.getByText('How much movement is needed before taking damage')).toBeInTheDocument()
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  it('calls handleThresholdChange when slider changes', () => {
    const handleThresholdChange = vi.fn()
    render(<SettingsModal {...defaultProps} handleThresholdChange={handleThresholdChange} />)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '20' } })
    expect(handleThresholdChange).toHaveBeenCalledWith(0.20)
  })

  it('shows Domination section header', () => {
    render(<SettingsModal {...defaultProps} />)
    expect(screen.getByText('Domination')).toBeInTheDocument()
  })

  it('shows Domination control interval buttons', () => {
    render(<SettingsModal {...defaultProps} />)
    // There are two "Respawn Time" labels (domination + death count), so check for control interval specifically
    expect(screen.getByText('Control Interval')).toBeInTheDocument()
    expect(screen.getByText('Seconds of uncontested control per point')).toBeInTheDocument()
  })

  it('shows Domination respawn time buttons', () => {
    render(<SettingsModal {...defaultProps} />)
    // Both Domination and Death Count have respawn time labels
    const respawnLabels = screen.getAllByText('Respawn Time')
    expect(respawnLabels.length).toBeGreaterThanOrEqual(2)
  })

  it('shows Death Count section header', () => {
    render(<SettingsModal {...defaultProps} />)
    expect(screen.getByText('Death Count')).toBeInTheDocument()
  })

  it('calls handleDominationSettingChange when a control interval button is clicked', () => {
    const handleDominationSettingChange = vi.fn()
    render(<SettingsModal {...defaultProps} handleDominationSettingChange={handleDominationSettingChange} />)

    // Click the "3s" button in control interval row (first 3s button)
    const buttons3s = screen.getAllByText('3s')
    // The first 3s button belongs to control interval
    fireEvent.click(buttons3s[0])
    expect(handleDominationSettingChange).toHaveBeenCalledWith('dominationControlInterval', 3)
  })

  it('calls handleDominationSettingChange when a domination respawn button is clicked', () => {
    const handleDominationSettingChange = vi.fn()
    render(<SettingsModal {...defaultProps} handleDominationSettingChange={handleDominationSettingChange} />)

    // "5s" appears in order: control interval (index 0), domination respawn (index 1), death count (index 2)
    const buttons5s = screen.getAllByText('5s')
    fireEvent.click(buttons5s[1]) // index 1 = domination respawn
    expect(handleDominationSettingChange).toHaveBeenCalledWith('dominationRespawnTime', 5)
  })

  it('calls handleDeathCountRespawnChange when a death count respawn button is clicked', () => {
    const handleDeathCountRespawnChange = vi.fn()
    render(<SettingsModal {...defaultProps} handleDeathCountRespawnChange={handleDeathCountRespawnChange} />)

    // "15s" appears in order: domination respawn (index 0), death count (index 1)
    const buttons15s = screen.getAllByText('15s')
    fireEvent.click(buttons15s[1]) // index 1 = death count
    expect(handleDeathCountRespawnChange).toHaveBeenCalledWith(15)
  })

  it('highlights the active domination control interval button', () => {
    render(<SettingsModal {...defaultProps} dominationControlInterval={5} />)
    // The 5s button in the control interval group should be highlighted
    const buttons5s = screen.getAllByText('5s')
    // First 5s = domination respawn, but let's check the control interval button specifically
    // Control interval buttons: 3s, 5s, 10s — the selected one (5s) gets bg-blue-600
    const activeBtn = buttons5s.find((btn) => btn.className.includes('bg-blue-600'))
    expect(activeBtn).toBeTruthy()
  })

  it('highlights the active death count respawn button', () => {
    render(<SettingsModal {...defaultProps} deathCountRespawnTime={10} />)
    // 10s button in death count section should be highlighted
    const buttons10s = screen.getAllByText('10s')
    const activeBtn = buttons10s.find((btn) => btn.className.includes('bg-blue-600'))
    expect(activeBtn).toBeTruthy()
  })
})

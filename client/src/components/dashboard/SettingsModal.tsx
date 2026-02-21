interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dangerThreshold: number;
  dominationControlInterval: number;
  dominationRespawnTime: number;
  deathCountRespawnTime: number;
  loading: boolean;
  handleThresholdChange: (value: number) => void;
  handleDominationSettingChange: (key: string, value: number) => void;
  handleDeathCountRespawnChange: (value: number) => void;
}

function SettingsModal({
  isOpen,
  onClose,
  dangerThreshold,
  dominationControlInterval,
  dominationRespawnTime,
  deathCountRespawnTime,
  loading,
  handleThresholdChange,
  handleDominationSettingChange,
  handleDeathCountRespawnChange,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg p-6 border border-gray-700 w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Advanced Settings</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        {/* Movement Threshold */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">
            Movement Threshold: {(dangerThreshold * 100).toFixed(0)}%
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Sensitive</span>
            <input
              type="range"
              min="1"
              max="50"
              value={Math.round(dangerThreshold * 100)}
              onChange={(e) =>
                handleThresholdChange(parseInt(e.target.value) / 100)
              }
              disabled={loading}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-xs text-gray-500">Forgiving</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            How much movement is needed before taking damage
          </p>
        </div>

        {/* Domination section */}
        <div className="mb-2">
          <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
            Domination
          </h4>

          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Control Interval</label>
            <div className="flex gap-2">
              {[3, 5, 10].map((sec) => (
                <button
                  key={sec}
                  onClick={() =>
                    handleDominationSettingChange("dominationControlInterval", sec)
                  }
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dominationControlInterval === sec
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Seconds of uncontested control per point
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Respawn Time</label>
            <div className="flex gap-2">
              {[5, 10, 15].map((sec) => (
                <button
                  key={sec}
                  onClick={() =>
                    handleDominationSettingChange("dominationRespawnTime", sec)
                  }
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dominationRespawnTime === sec
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Death Count section */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
            Death Count
          </h4>

          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Respawn Time</label>
            <div className="flex gap-2">
              {[3, 5, 10, 15].map((sec) => (
                <button
                  key={sec}
                  onClick={() => handleDeathCountRespawnChange(sec)}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    deathCountRespawnTime === sec
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;

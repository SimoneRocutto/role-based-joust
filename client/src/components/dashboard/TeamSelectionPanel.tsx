interface TeamSelectionPanelProps {
  teamCount: number;
  loading: boolean;
  error: string | null;
  connectedPlayers: Array<{ id: string }>;
  handleShuffleTeams: () => void;
  handleLaunchGame: () => void;
  handleCancelTeamSelection: () => void;
}

function TeamSelectionPanel({
  teamCount,
  loading,
  error,
  connectedPlayers,
  handleShuffleTeams,
  handleLaunchGame,
  handleCancelTeamSelection,
}: TeamSelectionPanelProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-blue-600">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-2xl font-bold">Team Selection</h2>
        <span className="px-3 py-1 bg-blue-600 text-blue-100 text-sm font-semibold rounded">
          {teamCount} teams
        </span>
      </div>

      <p className="text-gray-400 mb-4">
        Players can tap their screen to switch teams. Press Start Game when
        ready.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
          {error}
        </div>
      )}

      <div className="flex gap-4 items-center">
        <button
          onClick={handleShuffleTeams}
          disabled={loading}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-bold text-lg transition-colors"
        >
          Shuffle Teams
        </button>

        <button
          onClick={handleLaunchGame}
          disabled={loading || connectedPlayers.length < 2}
          className="px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-bold text-xl transition-colors"
        >
          {loading ? "Starting..." : "Start Game"}
        </button>

        <button
          onClick={handleCancelTeamSelection}
          disabled={loading}
          className="px-6 py-3 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 rounded-lg font-medium text-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default TeamSelectionPanel;

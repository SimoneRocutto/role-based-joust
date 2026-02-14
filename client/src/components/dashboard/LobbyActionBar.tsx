import { apiService } from "@/services/api";

interface LobbyPlayer {
  id: string;
  name: string;
  number: number;
  isConnected?: boolean;
}

interface LobbyActionBarProps {
  players: LobbyPlayer[];
  connectedPlayers: LobbyPlayer[];
  disconnectedPlayers: LobbyPlayer[];
  teamsEnabled: boolean;
  isDevMode: boolean;
  loading: boolean;
  error: string | null;
  qrDataUrl: string | null;
  joinUrl: string;
  handleStartClick: () => void;
}

function LobbyActionBar({
  players,
  connectedPlayers,
  disconnectedPlayers,
  teamsEnabled,
  isDevMode,
  loading,
  error,
  qrDataUrl,
  joinUrl,
  handleStartClick,
}: LobbyActionBarProps) {
  return (
    <>
      {/* Connected Players (only when teams disabled — team lobby grid handles team display) */}
      {!teamsEnabled && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">
            Connected Players: {connectedPlayers.length}
            {disconnectedPlayers.length > 0 && (
              <span className="text-gray-500 text-sm font-normal ml-2">
                ({disconnectedPlayers.length} offline)
              </span>
            )}
          </h3>
          {players.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`px-3 py-2 bg-gray-700 rounded text-sm flex items-center justify-between ${
                    p.isConnected === false ? 'opacity-40' : ''
                  }`}
                >
                  <span>
                    #{p.number} {p.name}
                    {p.isConnected === false && (
                      <span className="text-gray-500 text-xs ml-1">OFFLINE</span>
                    )}
                  </span>
                  <button
                    onClick={() => apiService.kickPlayer(p.id)}
                    className="ml-2 text-red-400 hover:text-red-300 text-xs font-bold px-1"
                    title={`Kick ${p.name}`}
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No players connected yet...</p>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Action Button + QR Code */}
      <div className="flex gap-4 items-center">
        <button
          onClick={handleStartClick}
          disabled={loading || connectedPlayers.length < 2}
          className="px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-bold text-xl transition-colors"
        >
          {loading ? "Starting..." : `Start Game (${connectedPlayers.length} players)`}
        </button>

        {/* QR Code for joining */}
        {qrDataUrl && (
          <div className="flex flex-col items-center gap-1 ml-auto">
            <img src={qrDataUrl} alt="Scan to join" width={120} height={120} />
            <span className="text-xs text-gray-400 select-all">{joinUrl}</span>
          </div>
        )}
      </div>
    </>
  );
}

export default LobbyActionBar;

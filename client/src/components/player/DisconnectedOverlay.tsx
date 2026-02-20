interface DisconnectedOverlayProps {
  isReconnecting: boolean;
  onRetry: () => void;
  onRejoin: () => void;
}

export default function DisconnectedOverlay({
  isReconnecting,
  onRetry,
  onRejoin,
}: DisconnectedOverlayProps) {
  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center z-50 p-8">
      <div className="text-red-500 text-6xl mb-6">⚡</div>

      <h2 className="text-white text-2xl font-bold mb-2 text-center">
        {isReconnecting ? "Reconnecting..." : "Connection lost"}
      </h2>
      <p className="text-gray-400 text-center mb-10 text-sm">
        {isReconnecting
          ? "Attempting to reconnect to the server"
          : "Could not reach the server. Try again or rejoin with your name."}
      </p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={onRetry}
          disabled={isReconnecting}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-lg font-bold rounded-lg transition-colors"
        >
          {isReconnecting ? "Trying..." : "TRY AGAIN"}
        </button>

        <button
          onClick={onRejoin}
          disabled={isReconnecting}
          className="w-full py-4 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-lg transition-colors"
        >
          REJOIN
        </button>
      </div>
    </div>
  );
}

interface ShakeToReadyProps {
  isReady: boolean;
  isShaking: boolean;
  shakeProgress: number;
  onReadyClick: () => void;
  shakeLabel: string;
  buttonLabel: string;
  waitingMessage: string;
  isDevMode: boolean;
}

export default function ShakeToReady({
  isReady,
  isShaking,
  shakeProgress,
  onReadyClick,
  shakeLabel,
  buttonLabel,
  waitingMessage,
  isDevMode,
}: ShakeToReadyProps) {
  if (isReady) {
    return (
      <div className="mt-8 space-y-2">
        <div className="text-6xl">&#10003;</div>
        <div className="text-2xl text-green-400 font-bold">READY!</div>
        <div className="text-gray-500">{waitingMessage}</div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {isDevMode ? (
        <>
          <button
            onClick={onReadyClick}
            className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black text-2xl font-bold rounded-lg transition-colors"
          >
            {buttonLabel}
          </button>
          <div className="text-sm text-yellow-600 font-mono">[DEV MODE]</div>
        </>
      ) : (
        <>
          <div
            className={`text-2xl font-bold ${
              isShaking ? "text-yellow-400" : "text-gray-400"
            }`}
          >
            {isShaking ? "SHAKING..." : shakeLabel}
          </div>

          <div className="w-48 h-3 bg-gray-700 rounded-full overflow-hidden mx-auto">
            <div
              className="h-full bg-yellow-400 transition-all duration-100"
              style={{ width: `${shakeProgress * 100}%` }}
            />
          </div>

          <div className="text-sm text-gray-500">
            Shake your device to ready up
          </div>
        </>
      )}
    </div>
  );
}

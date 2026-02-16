interface QrCodeProps {
  qrDataUrl: string
  joinUrl: string
}

function QrCode({ qrDataUrl, joinUrl }: QrCodeProps) {
  return (
    <div className="flex flex-col items-center gap-1 ml-auto">
      <img src={qrDataUrl} alt="Scan to join" width={120} height={120} />
      <span className="text-xs text-gray-400 select-all">{joinUrl}</span>
    </div>
  )
}

export default QrCode

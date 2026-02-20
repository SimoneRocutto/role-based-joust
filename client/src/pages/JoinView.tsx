import { Navigate } from "react-router-dom";

// The join experience now lives inside /player.
// Any link/QR code pointing to /join is silently redirected.
export default function JoinView() {
  return <Navigate to="/player" replace />;
}

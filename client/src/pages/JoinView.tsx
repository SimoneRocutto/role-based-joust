import { Navigate, useLocation } from "react-router-dom";

// The join experience now lives inside /player.
// Any link/QR code pointing to /join is silently redirected, preserving query params.
export default function JoinView() {
  const { search } = useLocation();
  return <Navigate to={`/player${search}`} replace />;
}

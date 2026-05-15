import { Navigate } from "react-router-dom";
import { hasValidAuthToken } from "../api/client";

function GuestRoute({ children }) {
  if (hasValidAuthToken()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default GuestRoute;

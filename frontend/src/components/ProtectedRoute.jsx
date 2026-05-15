import { Navigate, useLocation } from "react-router-dom";
import { hasValidAuthToken } from "../api/client";

function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!hasValidAuthToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default ProtectedRoute;

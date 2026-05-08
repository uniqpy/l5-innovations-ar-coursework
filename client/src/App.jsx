import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LogInPage from "./pages/LogInPage.jsx";
import ArPage from "./pages/ArPage.jsx";
import ProtectedRoute from "./pages/ProtectedRoute.jsx";
import "./App.css";
import { API_BASE_URL } from "./config/api";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
        method: "GET",
        credentials: "include",
      });
      setIsAuthenticated(response.ok);
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setIsCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (isCheckingSession) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100 bg-light text-secondary">
        Loading secure session...
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/LogInPage"
        element={
          <LogInPage
            isAuthenticated={isAuthenticated}
            onLoginSuccess={() => setIsAuthenticated(true)}
          />
        }
      />
      <Route
        path="/ArPage"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isCheckingSession}>
            <ArPage onLoggedOut={() => setIsAuthenticated(false)} />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/ArPage" : "/LogInPage"} replace />} />
    </Routes>
  );
}


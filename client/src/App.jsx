import { Routes, Route, Navigate } from 'react-router-dom';
import LogInPage from './pages/LogInPage.jsx';
import ArPage from './pages/ArPage.jsx';
import ProtectedRoute from './pages/ProtectedRoute.jsx';
import MindARDentPage from './pages/MindARDentPage.jsx';
import './App.css';
import useToken from './useToken.jsx';

// Load different parts of site.
export default function App() {
  const { token, setToken } = useToken();

  return (
    <Routes>
      <Route
        path="/"
        element={token ? <Navigate to="/ArPage" replace /> : <LogInPage setToken={setToken} />}
      />
      <Route path="/LogInPage" element={<LogInPage setToken={setToken} />} />
      <Route path="/dent-demo" element={<MindARDentPage />} />
      <Route
        path="/ArPage"
        element={
          <ProtectedRoute token={token}>
            <ArPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

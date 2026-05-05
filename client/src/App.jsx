import { useState } from 'react'
import { Routes, Route } from 'react-router-dom';
import LogInPage from './pages/LogInPage.jsx';
import ArPage from './pages/ArPage.jsx';
import ProtectedRoute from './pages/ProtectedRoute.jsx';
import './App.css'
import useToken from './useToken.jsx';

function setToken(userToken) {
 sessionStorage.setItem("token", JSON.stringify(userToken));
}


//load different parts of site, we will begin on the LogInPage
export default function App() {
  const { token, setToken } = useToken();

  if (!token) {
    return <LogInPage setToken={setToken} />
  }
  return (
   <Routes>
    <Route path ="/LogInPage" element={<LogInPage setToken={setToken} />} />
    <Route
      path="/ArPage"
      element={
        <ProtectedRoute token = {token}>
          <ArPage/>
        </ProtectedRoute>
      }
   />
  </Routes>
  );
}


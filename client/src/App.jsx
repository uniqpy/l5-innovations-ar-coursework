import { useState } from 'react'
import { Routes, Route } from 'react-router-dom';
import LogInPage from './pages/LogInPage.jsx';
import ArPage from './pages/ArPage.jsx';
import './App.css'




//load different parts of site, we will begin on the LogInPage
export default function App() {
  return (
   <Routes>
      <Route index element = {<LogInPage/>}/>
      <Route path = "/ar" element = {<ArPage/>}/>
   </Routes>
  );
}


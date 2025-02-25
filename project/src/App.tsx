import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { AuthProvider } from './contexts/auth-context';
import { Dashboard } from './pages/dashboard';
import { Inventory } from './pages/inventory';
import { Login } from './pages/login';
import { AuthLogin } from './pages/auth/login';
import { Register } from './pages/register';
import { Recipes } from './pages/recipes';
import { Discover } from './pages/discover';
import { Pantry } from './pages/pantry';
import { Calendar } from './pages/calendar';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/login" element={<AuthLogin />} />
          <Route path="/register" element={<Register />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/pantry" element={<Pantry />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/discover" element={<Discover />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
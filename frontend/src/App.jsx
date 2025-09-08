// src/App.jsx - VERSIÓN FINAL-FINAL-DE-VERDAD

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importación de todos los componentes
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientHomePage from './pages/ClientHomePage';
import UserListPage from './pages/UserListPage';
import UserCreatePage from './pages/UserCreatePage';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* --- 1. RUTAS PÚBLICAS --- */}
        <Route path="/" element={<ClientHomePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* --- 2. ÁREA DE ADMINISTRACIÓN (PRIVADA) --- */}
        <Route 
          path="/admin" 
          element={
            <PrivateRoute>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          {/* La ruta "índice" de /admin será el dashboard */}
          <Route index element={<Navigate replace to="dashboard" />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<UserListPage />} />
          <Route path="users/create" element={<UserCreatePage />} />
        </Route>
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;
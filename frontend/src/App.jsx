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
import ProfilePage from './pages/ProfilePage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ProductListPage from './pages/ProductListPage';
import ProductFormPage from './pages/ProductFormPage';
import ProductAssetPage from './pages/ProductAssetPage';
import UserEditPage from './pages/UserEditPage';
import ClientListPage from './pages/ClientListPage';
import ClientFormPage from './pages/ClientFormPage';
import ProductAssetPage from './pages/ProductAssetPage';

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
          <Route path="profile" element={<ProfilePage />} />
          <Route path="change-password" element={<ChangePasswordPage />} />
          <Route path="products" element={<ProductListPage />} />
          <Route path="products/create" element={<ProductFormPage />} />
          <Route path="products/edit/:id" element={<ProductFormPage />} />
          <Route path="products/asset/:id" element={<ProductAssetPage />} />
          <Route path="users/edit/:id" element={<UserEditPage />} />
          <Route path="clients" element={<ClientListPage />} />
          <Route path="clients/create" element={<ClientFormPage />} />
          <Route path="clients/edit/:clientId" element={<ClientFormPage />} />
        </Route>
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;
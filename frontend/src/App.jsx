import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientHomePage from './pages/ClientHomePage';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- RUTAS PÚBLICAS --- */}
        <Route path="/" element={<ClientHomePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* --- RUTAS PRIVADAS --- */}
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <AdminLayout>
                <DashboardPage />
              </AdminLayout>
            </PrivateRoute>
          } 
        />
        {/* Aquí irán las otras rutas protegidas */}
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;
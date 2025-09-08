import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PrivateRoute from './components/PrivateRoute';

// Una página temporal para la vista del cliente
const ClientHomePage = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h1>Bienvenido a La Capital</h1>
    <p>Próximamente: ¡Experiencia de Realidad Aumentada!</p>
    <a href="/login">Acceso para personal</a>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- RUTAS PÚBLICAS --- */}
        <Route path="/" element={<ClientHomePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* --- RUTAS PRIVADAS --- */}
        {/* Ahora el AdminLayout completo está protegido por el guardián */}
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
        {/* Más adelante, protegeremos las otras rutas de la misma forma */}

      </Routes>
    </BrowserRouter>
  );
}

export default App;
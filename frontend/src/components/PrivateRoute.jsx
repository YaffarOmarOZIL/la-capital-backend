import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  // Nuestro guardia revisa si el usuario tiene el "pase" (token)
  const isAuthenticated = localStorage.getItem('authToken');

  if (!isAuthenticated) {
    // Si no tiene el pase, lo mandamos de vuelta al login
    return <Navigate to="/login" replace />;
  }

  // Si tiene el pase, le dejamos ver el contenido que quería ver
  return children;
};

export default PrivateRoute;
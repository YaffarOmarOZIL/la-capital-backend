import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { 
    hmr: {
      clientPort: 443 
    },
    allowedHosts: ['.gitpod.io'] ,
     proxy: {
      '/api': {
        // Apuntamos a tu backend desplegado en Render
        target: 'https://la-capital-backend.onrender.com', 
        changeOrigin: true,
        // Es una buena práctica añadir esto al apuntar a un https
        secure: false, 
      }
    }
  }
})
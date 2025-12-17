import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Załaduj zmienne środowiskowe (Vercel udostępnia je w procesie budowania)
  // Use '.' instead of process.cwd() to avoid TS error 'Property cwd does not exist on type Process'
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    define: {
      // Podmieniamy 'process.env.API_KEY' w kodzie na wartość zmiennej podczas budowania
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});
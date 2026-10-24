import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import './index.css';

const googleClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';

const appRoot = (
  <StrictMode>
    <ThemeProvider>
      {googleClientId ? (
        <GoogleOAuthProvider clientId={googleClientId}>
          <App />
        </GoogleOAuthProvider>
      ) : (
        <App />
      )}
    </ThemeProvider>
  </StrictMode>
);

createRoot(document.getElementById('root')!).render(appRoot);

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ResetPasswordPage from './ResetPasswordPage.tsx';
import './index.css';

// No router library in this app — just a plain pathname check, since the
// only standalone route is /reset-password (linked from the recovery email).
const isResetPasswordRoute = window.location.pathname.startsWith('/reset-password');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isResetPasswordRoute ? <ResetPasswordPage /> : <App />}
  </StrictMode>,
);


import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import { ConfirmProvider } from './hooks/useConfirm';
import './index.css';

createRoot(document.getElementById('root')!).render(
<BrowserRouter>
  <AuthProvider>
    <ConfirmProvider>
      <App />
    </ConfirmProvider>
  </AuthProvider>
</BrowserRouter>
);
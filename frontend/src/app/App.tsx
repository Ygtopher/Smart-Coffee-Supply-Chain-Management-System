import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'sonner';
import AutoTranslate from './components/AutoTranslate';

export default function App() {
  return (
    <AuthProvider>
      <AutoTranslate />
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

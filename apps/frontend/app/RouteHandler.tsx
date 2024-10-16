'use client';

import { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthProvider } from '../firebase/fbAuth';
import ProtectedRoute from './components/auth/ProtectedRoute';

const noAuthRequired = ['/', '/signin'];

interface RouteHandlerProps {
  children: ReactNode;
}

const RouteHandler = ({ children }: RouteHandlerProps) => {
  const router = useRouter();
  const pathname = usePathname() || '';

  console.log(pathname);

  return (
    <AuthProvider>
      {noAuthRequired.includes(pathname) ? (
        children
      ) : (
        <ProtectedRoute>{children}</ProtectedRoute>
      )}
    </AuthProvider>
  );
};

export default RouteHandler;
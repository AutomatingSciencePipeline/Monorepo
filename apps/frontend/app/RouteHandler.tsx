'use client';

import { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AuthProvider from './components/auth/AuthProvider';
import ProtectedRoute from './components/auth/ProtectedRoute';

const noAuthRequired = ['/', '/signin', '/share'];

interface RouteHandlerProps {
  children: ReactNode;
}

const RouteHandler = ({ children }: RouteHandlerProps) => {
  const router = useRouter();
  const pathname = usePathname() || '';

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
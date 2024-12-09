// app/components/AuthProvider.js
'use client'; // Ensure this runs in the client-side context

import { SessionProvider } from 'next-auth/react';

const AuthProvider = ({ children }) => {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
};

export default AuthProvider;

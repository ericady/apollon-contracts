'use client';

import { ApolloProvider } from '@apollo/client';
import { Inter } from 'next/font/google';
import { useEffect } from 'react';
import { client } from './client';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Initializes the service worker. TODO: Move it to a proper client-side location later.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
      import('../mocks').then((module) => {
        module.default();
      });
    }
  }, []);

  return (
    <html lang="en">
      <body className={inter.className}>
        <ApolloProvider client={client}>{children}</ApolloProvider>
      </body>
    </html>
  );
}

'use client';

import { CircularProgress } from '@mui/material';
import { useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect, useState } from 'react';

function MockServer({ children }: PropsWithChildren<{}>) {
  const { replace } = useRouter();

  const [mockStarted, setMockStarted] = useState(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
      import('../../mocks').then(async (module) => {
        await module.default();
        setMockStarted(true);
        if (location.pathname === '/') {
          replace('/spot');
        }
      });
    } else if (process.env.NEXT_PUBLIC_API_MOCKING === 'e2e') {
      setMockStarted(true);
    } else {
      setMockStarted(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mockStarted)
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
        <div style={{ display: 'grid', placeItems: 'center' }}>
          {process.env.NEXT_PUBLIC_API_MOCKING === 'enabled' ? 'MockServer is starting...' : 'Mocking is not enabled'}
          <CircularProgress />
        </div>
      </div>
    );

  return <div>{children}</div>;
}

export default MockServer;

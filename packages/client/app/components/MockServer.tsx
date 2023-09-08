'use client';

import { CircularProgress } from '@mui/material';
import { useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect, useState } from 'react';

function MockServer({ children }: PropsWithChildren<{}>) {
  const router = useRouter();
  const [mockStarted, setMockStarted] = useState(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
      import('../../mocks').then(async (module) => {
        await module.default();
        setMockStarted(true);
        router.replace('/spot');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mockStarted)
    return (
      <div style={{ display: 'grid', placeItems: 'center' }}>
        {process.env.NEXT_PUBLIC_API_MOCKING === 'enabled' ? 'MockServer is starting...' : 'Mocking is not enabled'}
        <CircularProgress />
      </div>
    );

  return <div>{children}</div>;
}

export default MockServer;

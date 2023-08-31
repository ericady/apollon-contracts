'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function MockServer() {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
      import('../../mocks').then(async (module) => {
        await module.default();
        router.replace('/spot');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div>MockServer is starting...</div>;
}

export default MockServer;

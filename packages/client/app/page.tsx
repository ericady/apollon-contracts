'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
    import('../mocks').then(async (module) => {
      await module.default();
      router.replace('/balance');
    });
  }

  return null;
}

'use client';

import { useRouter } from 'next/navigation';
import { SnackbarKey, useSnackbar } from 'notistack';
import { PropsWithChildren, useEffect } from 'react';

function DeviceFallbackController({ children }: PropsWithChildren<{}>) {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const { push } = useRouter();

  useEffect(() => {
    if (window.matchMedia('(max-width: 1499px)').matches) {
      push('/fallback');
    }

    let timeout: NodeJS.Timeout;
    const shownSnackbars: SnackbarKey[] = [];

    const handleResize = () => {
      if (window.matchMedia('(max-width: 1499px)').matches) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          const key = enqueueSnackbar(
            'This app is not optimized for mobile devices yet. Please use a desktop computer or laptop.',
            {
              variant: 'warning',
              autoHideDuration: 30000,
            },
          );
          shownSnackbars.push(key);
        }, 250);
      } else {
        shownSnackbars.forEach((key) => {
          closeSnackbar(key);
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [push, enqueueSnackbar, closeSnackbar]);

  return <>{children}</>;
}

export default DeviceFallbackController;

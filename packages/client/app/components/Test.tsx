'use client';

import { useEffect } from 'react';

function Test() {
  // Initializes the service worker. TODO: Move it to a proper client-side location later.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
      import('../../mocks').then((module) => {
        module.default();
      });
    }
  }, []);

  return <div data-test-id="test">Learn React</div>;
}

export default Test;

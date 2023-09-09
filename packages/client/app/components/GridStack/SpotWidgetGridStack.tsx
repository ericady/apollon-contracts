'use client';

import { GridStack } from 'gridstack';
import { PropsWithChildren, useEffect } from 'react';

function SpotWidgetGridStack({ children }: PropsWithChildren<{}>) {
  useEffect(() => {
    GridStack.init({
      draggable: {
        handle: '.grid-stack-apollo-drag-handle',
      },
      cellHeight: 10,
      disableResize: true,
    });
  }, []);

  return (
    <div className="grid-stack" style={{ height: '100%' }}>
      {children}
    </div>
  );
}

export default SpotWidgetGridStack;

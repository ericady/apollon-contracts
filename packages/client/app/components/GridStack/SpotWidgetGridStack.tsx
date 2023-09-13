'use client';

import { GridStack } from 'gridstack';
import { PropsWithChildren, useEffect } from 'react';

const SPOT_PAGE_GRID_STATE_KEY = 'apollon-spot-page-grid-state';

function SpotWidgetGridStack({ children }: PropsWithChildren<{}>) {
  useEffect(() => {
    const grid = GridStack.init({
      draggable: {
        handle: '.grid-stack-apollo-drag-handle',
      },
      cellHeight: 10,
      disableResize: true,
    });

    // Load last saved grid state and change the order of the widgets accordingly
    const previousGridState = JSON.parse(localStorage.getItem(SPOT_PAGE_GRID_STATE_KEY) ?? '[]');
    if (previousGridState.length === 3) {
      grid.batchUpdate(true);
      grid.getGridItems().forEach((widget) => {
        const state = previousGridState.find((state: { id: string; y: number }) => state.id === widget.id);
        grid.update(widget, { y: state.y });
      });
      grid.batchUpdate(false);
    }

    // Save grid state to local storage on unmount
    grid.on('change', () => {
      const gridSavePoint: { id: string; y: number }[] = [];
      grid.save(false, false, ({ y, el }) => {
        gridSavePoint.push({ id: el!.id, y: y as number });
      });
      localStorage.setItem(SPOT_PAGE_GRID_STATE_KEY, JSON.stringify(gridSavePoint));
    });
  }, []);

  return <div className="grid-stack">{children}</div>;
}

export default SpotWidgetGridStack;
